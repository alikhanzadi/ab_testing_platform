// Rule-based guidance engine. Acts as the "senior experimentation partner":
// parses the business question, frames the problem, drafts hypotheses,
// and recommends a test type. Deliberately conservative — flags weak designs
// rather than assuming everything is a clean A/B test.

import type {
  BusinessFunction,
  ExperimentQuestion,
  FramingIssue,
  Hypothesis,
  MetricKind,
  ProblemFraming,
  Severity,
  TestRecommendation,
} from "./types";

interface KeywordRule {
  pattern: RegExp;
  fn: BusinessFunction;
}

const FUNCTION_RULES: KeywordRule[] = [
  { pattern: /email|subject line|campaign|ad |ads |advertis|creative|landing page|cta/i, fn: "marketing" },
  { pattern: /pric|discount|coupon|promo|plan|billing/i, fn: "pricing" },
  { pattern: /retention|churn|renew|repeat|come back|d7|d30|resubscrib/i, fn: "retention" },
  { pattern: /onboarding|activation|signup|sign-up|sign up|trial|acquisition|funnel/i, fn: "growth" },
  { pattern: /marketplace|creator|seller|buyer|dispatch|delivery|matching|supply/i, fn: "marketplace" },
  { pattern: /sales|demo|pipeline|quota|outreach/i, fn: "sales" },
  { pattern: /support|routing|ops |operations|logistics|fulfillment/i, fn: "operations" },
  { pattern: /lifecycle|nurture|winback|win-back|re-engage/i, fn: "lifecycle" },
  { pattern: /feature|checkout|recommendation|search|feed|flow|page|button|module|design/i, fn: "product" },
];

interface MetricRule {
  pattern: RegExp;
  kind: MetricKind;
  kpi: string;
}

const METRIC_RULES: MetricRule[] = [
  { pattern: /revenue per|arpu|rpu|revenue-per/i, kind: "revenue", kpi: "Revenue per user" },
  { pattern: /revenue|purchase value|order value|aov|spend|monetiz|token purchase|earnings/i, kind: "revenue", kpi: "Revenue per user" },
  { pattern: /retention|churn|renew|repeat purchase|come back|d7|d30/i, kind: "retention", kpi: "Retention rate" },
  { pattern: /abandon/i, kind: "binary", kpi: "Cart abandonment rate" },
  { pattern: /activation|activate/i, kind: "binary", kpi: "Activation rate" },
  { pattern: /signup|sign-up|sign up|registration/i, kind: "binary", kpi: "Signup conversion rate" },
  { pattern: /trial start/i, kind: "binary", kpi: "Trial start rate" },
  { pattern: /click|ctr|open rate/i, kind: "binary", kpi: "Click-through rate" },
  { pattern: /convert|conversion|purchase|checkout|buy/i, kind: "binary", kpi: "Conversion rate" },
  { pattern: /session duration|time on|time spent|watch time|minutes/i, kind: "continuous", kpi: "Average session duration" },
  { pattern: /engagement|sessions per|visits per|frequency|messages per/i, kind: "engagement", kpi: "Engagement frequency" },
  { pattern: /nps|satisfaction|rating|score/i, kind: "ordinal", kpi: "Satisfaction rating" },
];

const VAGUE_PATTERNS = /like|love|prefer|better|good|happy|enjoy|feel/i;

function detectFunction(q: string): BusinessFunction {
  for (const rule of FUNCTION_RULES) if (rule.pattern.test(q)) return rule.fn;
  return "general";
}

function detectMetric(q: string): { kind: MetricKind; kpi: string } {
  for (const rule of METRIC_RULES) if (rule.pattern.test(q)) return { kind: rule.kind, kpi: rule.kpi };
  return { kind: "binary", kpi: "Primary conversion rate" };
}

function detectChange(q: string): string {
  const m = q.match(/(new|changing|change|adding|add|redesign(?:ed)?|simplif\w+|showing|remov\w+|updat\w+|discount)\s+(?:the\s+|a\s+)?([\w\s-]{3,60}?)(?:\s+(?:will|increase|improve|reduce|affect|impact|change|help|boost|drive|on|for|to)\b|[?.,]|$)/i);
  if (m) return `${m[1]} ${m[2]}`.trim().toLowerCase();
  return "the proposed change";
}

function detectAudience(q: string): string {
  const m = q.match(/(?:for|among|of)\s+((?:new|first-time|existing|returning|all|trial|paid|free)?\s*(?:users|visitors|customers|subscribers|accounts|creators|buyers|sellers|leads))/i);
  if (m) return m[1].trim();
  if (/onboarding|signup|sign up|landing|acquisition|trial/i.test(q)) return "new visitors / first-time users";
  return "all eligible users";
}

export function analyzeQuestion(raw: string): ExperimentQuestion {
  const fn = detectFunction(raw);
  const { kind, kpi } = detectMetric(raw);
  const change = detectChange(raw);
  const audience = detectAudience(raw);
  const vague = VAGUE_PATTERNS.test(raw) && !/increase|decrease|reduce|improve|conversion|rate|revenue/i.test(raw);

  const kpiLower = kpi.toLowerCase();
  const refined = vague
    ? `Does ${change === "the proposed change" ? "the proposed change" : change} increase ${kpiLower} among ${audience} compared with the current experience?`
    : normalizeQuestion(raw, change, kpiLower, audience);

  const guardrails = pickGuardrails(fn, kind);

  return {
    raw,
    refined,
    businessFunction: fn,
    decision: `Whether to ship ${change} to 100% of ${audience}`,
    audience,
    currentExperience: "The existing (control) experience",
    proposedChange: change,
    expectedBehaviorChange: expectedBehavior(kind, kpiLower),
    primaryKpi: kpi,
    metricKind: kind,
    secondaryKpis: pickSecondary(fn, kind),
    guardrails,
    risks: pickRisks(fn),
    dataNeeded: ["user_id (or unit_id)", "variant assignment", `outcome metric (${kpiLower})`, "exposure timestamp"],
    testable: true,
    testableReason:
      "The change can be randomized at the user level and the outcome is measurable per user, so a controlled experiment is possible. Confirm that users can actually be randomly assigned before launch.",
  };
}

function normalizeQuestion(raw: string, change: string, kpi: string, audience: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (/^(does|will|can|is|do)\b/i.test(trimmed) && /increase|decrease|reduce|improve/i.test(trimmed)) {
    return trimmed.endsWith("?") ? trimmed : trimmed + "?";
  }
  return `Does ${change} increase ${kpi} among ${audience} compared with the current experience?`;
}

function expectedBehavior(kind: MetricKind, kpi: string): string {
  switch (kind) {
    case "binary":
      return `More exposed users complete the target action, raising ${kpi}.`;
    case "revenue":
      return `Exposed users spend more on average, raising ${kpi}.`;
    case "retention":
      return `Exposed users return at a higher rate in the retention window.`;
    case "continuous":
    case "engagement":
      return `Exposed users engage more per user, raising ${kpi}.`;
    default:
      return `Exposed users shift the target behavior, moving ${kpi}.`;
  }
}

function pickSecondary(fn: BusinessFunction, kind: MetricKind): string[] {
  const base: string[] = [];
  if (kind === "binary") base.push("Downstream activation rate", "Time to complete the target action");
  if (kind === "revenue") base.push("Purchase conversion rate", "Average order value");
  if (kind === "retention") base.push("Engagement frequency", "Feature adoption rate");
  if (kind === "continuous" || kind === "engagement") base.push("Return visit rate", "Depth of engagement");
  if (fn === "marketing") base.push("Click-through rate");
  return base.slice(0, 3);
}

function pickGuardrails(fn: BusinessFunction, kind: MetricKind): string[] {
  const g = ["Unsubscribe / opt-out rate"];
  if (kind === "revenue" || fn === "pricing") g.unshift("Refund rate");
  if (fn === "product" || fn === "growth") g.unshift("Error / page load performance", "Support ticket rate");
  if (fn === "retention" || fn === "lifecycle") g.unshift("Churn rate");
  return [...new Set(g)].slice(0, 3);
}

function pickRisks(fn: BusinessFunction): string[] {
  const risks = [
    "Novelty effect: early lift may fade as users get used to the change",
    "Seasonality: launching during unusual periods can bias results",
  ];
  if (fn === "pricing") risks.push("Customer trust risk: visible price differences between users can cause complaints");
  if (fn === "marketplace") risks.push("Interference: treated and control units may affect each other through shared supply");
  return risks;
}

// ---------- Problem framing ----------

export function frameproblem(q: ExperimentQuestion): ProblemFraming {
  const issues: FramingIssue[] = [];

  if (q.proposedChange === "the proposed change") {
    issues.push({
      issue: "Unclear treatment",
      severity: "medium",
      why: "The platform could not identify a concrete change from the question. Without a specific treatment, the test cannot be built or interpreted.",
      fix: "Describe exactly what will be different for the treatment group (e.g., 'three-field signup form instead of six fields').",
    });
  }
  if (q.metricKind === "ordinal") {
    issues.push({
      issue: "Attitudinal metric",
      severity: "medium",
      why: "Ratings and satisfaction scores are noisy, easily biased, and often disconnected from behavior.",
      fix: "Pair the rating with a behavioral KPI (conversion, retention, engagement) as the primary metric.",
    });
  }
  if (/everything|whole|entire|complete redesign|all of/i.test(q.raw)) {
    issues.push({
      issue: "Multiple unrelated changes bundled",
      severity: "high",
      why: "If several things change at once, a lift or drop cannot be attributed to any single change.",
      fix: "Split into separate experiments, or accept that the test measures the bundle as a whole.",
    });
  }
  if (/brand|awareness|perception|sentiment/i.test(q.raw)) {
    issues.push({
      issue: "Delayed / hard-to-measure outcome",
      severity: "medium",
      why: "Brand and perception metrics move slowly and are hard to attribute to a single experience change.",
      fix: "Choose a leading behavioral indicator available within the test window.",
    });
  }
  if (/site-wide|sitewide|price change for everyone|all users at once|cannot randomize|can't randomize/i.test(q.raw)) {
    issues.push({
      issue: "Randomization may not be possible",
      severity: "high",
      why: "If everyone gets the change at the same time, there is no concurrent control group and a standard A/B test is invalid.",
      fix: "Consider a geo experiment, difference-in-differences, or a staged rollout with a holdout.",
    });
  }

  const severityRank: Record<Severity, number> = { low: 0, medium: 1, high: 2, "not-recommended": 3 };
  const overall: Severity = issues.length === 0 ? "low" : issues.map((i) => i.severity).sort((a, b) => severityRank[b] - severityRank[a])[0];

  return {
    problemStatement: `${q.audience[0].toUpperCase() + q.audience.slice(1)} currently experience ${q.currentExperience.toLowerCase()}, and the team believes ${q.proposedChange} will improve ${q.primaryKpi.toLowerCase()}. The experiment will determine whether this belief holds before committing to a full rollout.`,
    businessContext: `This is a ${q.businessFunction} initiative. The primary KPI is ${q.primaryKpi.toLowerCase()}, and the decision at stake is: ${q.decision.toLowerCase()}.`,
    behaviorInfluenced: q.expectedBehaviorChange,
    baselineAssumption: `The current ${q.primaryKpi.toLowerCase()} is stable enough to serve as a baseline. Verify with recent data before finalizing the power analysis.`,
    painPoint: `The current experience is believed to underperform on ${q.primaryKpi.toLowerCase()}.`,
    expectedImpact: `A measurable lift in ${q.primaryKpi.toLowerCase()} without harming ${q.guardrails.map((g) => g.toLowerCase()).join(" or ")}.`,
    whyItMatters: "Shipping without evidence risks investing in a change that does nothing — or that quietly hurts a guardrail metric. A controlled test converts opinion into a measured decision.",
    decisionAfterTest: `${q.decision}. If the result is positive and guardrails are clean: ship. If negative or harmful: do not ship. If inconclusive: iterate or extend.`,
    riskWithoutTesting: "Full rollout of an unproven change can lock in a worse experience, and the impact would be invisible without a control group.",
    riskOfOverTesting: "Testing trivially small changes delays roadmap work and consumes traffic that higher-leverage experiments need.",
    successLooksLike: `A statistically significant lift in ${q.primaryKpi.toLowerCase()} that also clears the practical significance threshold, with clean guardrails.`,
    inconclusiveLooksLike: "The confidence interval spans zero and includes both meaningful lift and meaningful decline — usually a sign of an underpowered test.",
    harmfulLooksLike: `A significant decline in ${q.primaryKpi.toLowerCase()}, or a guardrail regression (e.g., ${q.guardrails[0]?.toLowerCase() ?? "refund rate"} rising) even if the primary metric improves.`,
    issues,
    overallSeverity: overall,
  };
}

// ---------- Hypothesis ----------

export function buildHypothesis(q: ExperimentQuestion): Hypothesis {
  const kpi = q.primaryKpi.toLowerCase();
  const change = q.proposedChange;
  const reason = q.metricKind === "binary" ? "users will face less friction completing the action" : "the change makes the desired behavior easier or more attractive";
  return {
    primary: `We believe that ${change} for ${q.audience} will cause ${q.expectedBehaviorChange.toLowerCase().replace(/\.$/, "")}, resulting in a measurable increase in ${kpi}, because ${reason}.`,
    nullHypothesis: `${capitalize(change)} has no effect on ${kpi}.`,
    alternative: `${capitalize(change)} changes ${kpi}.`,
    directional: `${capitalize(change)} increases ${kpi}.`,
    direction: "increase",
    mdeRecommendation:
      q.metricKind === "revenue"
        ? "Revenue metrics are noisy; a relative MDE of 5–10% is a realistic floor unless traffic is very large."
        : "For conversion metrics, a relative MDE of 5–15% is typical. Choose the smallest lift that would still justify shipping.",
    successCriteria: `Statistically significant lift in ${kpi} at the chosen confidence level AND the lift exceeds the practical significance threshold AND guardrails show no significant harm.`,
    failureCriteria: `Statistically significant decline in ${kpi}, or any significant guardrail regression.`,
    inconclusiveCriteria: "Confidence interval includes zero and the test reached its planned sample size — treat as 'no detectable effect at this sensitivity', not as proof of no effect.",
    practicalThreshold: "Set this before launch: the minimum lift that justifies the engineering, design, and opportunity cost of shipping. Statistical significance below this threshold should not trigger a ship decision.",
    riskAssumptions: [
      "Users can be randomly and independently assigned to variants",
      "Each user sees only one variant for the duration of the test",
      "The metric is logged identically for both groups",
      "No other major launch targets the same audience during the test",
    ],
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Test selection ----------

export function recommendTest(q: ExperimentQuestion, confidenceLevel = 0.95): TestRecommendation {
  // Special cases first — not everything is a standard A/B test.
  if (/switchback|dispatch|ranking algorithm|matching algorithm|surge|time block/i.test(q.raw) || (q.businessFunction === "marketplace" && /algorithm|pricing|dispatch|ranking/i.test(q.raw))) {
    return rec("switchback-test", "Switchback Test", q, confidenceLevel, {
      why: "The treatment affects a shared system (marketplace, dispatch, ranking) where treated and control users would interfere with each other. Randomizing by time block avoids that contamination.",
      question: "Does the new system logic outperform the old one when alternated over time blocks?",
      data: ["time_block", "variant", "outcome metric per block", "timestamp"],
      assumptions: ["No strong carryover between adjacent time blocks", "Time blocks are comparable (or scheduled to balance day/hour effects)"],
      limitations: ["Time-based confounding", "Fewer effective observations than user-level tests"],
      risks: ["Carryover effects between blocks can bias results"],
      alternatives: [
        { testId: "geo-experiment", name: "Geo Experiment", when: "If regions are isolated enough to randomize geographically" },
        { testId: "cluster-randomized-test", name: "Cluster Randomized Test", when: "If natural clusters (cities, stores) exist" },
      ],
      mvp: false,
    });
  }
  if (/geo|city|cities|region|market|tv campaign|billboard|offline ad/i.test(q.raw)) {
    return rec("geo-experiment", "Geo Experiment", q, confidenceLevel, {
      why: "The change cannot be randomized at the user level (offline media or region-level rollout), so randomizing by geography is the cleanest available design.",
      question: "Do treated regions outperform comparable control regions?",
      data: ["geo unit", "variant", "outcome metric per geo per period", "period"],
      assumptions: ["Treated and control regions have similar trends", "Limited spillover between regions"],
      limitations: ["Few randomization units → wide confidence intervals", "Regional shocks can confound"],
      risks: ["Spillover between neighboring regions"],
      alternatives: [
        { testId: "difference-in-differences", name: "Difference-in-Differences", when: "If regions cannot be randomized at all" },
      ],
      mvp: false,
    });
  }
  if (/site-wide|sitewide|everyone at once|before and after|pre\/post|cannot randomize|can't randomize/i.test(q.raw)) {
    return rec("difference-in-differences", "Difference-in-Differences", q, confidenceLevel, {
      why: "Randomization is not available, so the strongest quasi-experimental option is comparing the change in the treated group against the change in an untreated comparison group.",
      question: "Did the treated group's metric change more than the comparison group's over the same period?",
      data: ["group", "period (pre/post)", "outcome metric"],
      assumptions: ["Parallel trends: both groups would have moved together absent the change"],
      limitations: ["Weaker causal evidence than randomized tests", "Sensitive to differential trends"],
      risks: ["External events hitting one group can masquerade as treatment effects"],
      alternatives: [
        { testId: "pre-post-test", name: "Pre/Post Test", when: "If no comparison group exists at all (weakest option)" },
        { testId: "geo-experiment", name: "Geo Experiment", when: "If some regions can still be held back" },
      ],
      mvp: false,
    });
  }
  if (/retention|churn|renew|d7|d30|repeat purchase/i.test(q.raw) || q.metricKind === "retention") {
    return rec("retention-cohort-test", "Retention Cohort Test (A/B on retention)", q, confidenceLevel, {
      why: "The outcome is whether users return within a defined window, so the experiment must wait out the retention window and compare retention rates between randomized groups — analyzed as a two-proportion test.",
      question: "Does the treatment increase the share of users retained at the chosen window (e.g., D7, D30)?",
      data: ["user_id", "variant", "retained (0/1) at window", "exposure_timestamp"],
      assumptions: ["Random assignment", "All users have aged past the retention window before analysis"],
      limitations: ["Slow: must wait for the window", "Often underpowered because retention deltas are small"],
      risks: ["Analyzing users before they age out of the window biases results"],
      alternatives: [
        { testId: "ab-test", name: "A/B Test on a leading indicator", when: "If a faster proxy metric predicts retention" },
      ],
      mvp: true,
    });
  }
  if (/three|four|five|multiple (versions|variants|subject lines|pages)|\b3\b|\b4\b/i.test(q.raw) && /version|variant|subject line|page|option|design/i.test(q.raw)) {
    return rec("abn-test", "A/B/n Test", q, confidenceLevel, {
      why: "More than one treatment is being compared against control, so each variant is tested against control with a multiple-comparison correction to keep the false positive rate honest.",
      question: "Which of several variants outperforms control, after correcting for multiple comparisons?",
      data: ["user_id", "variant (control + 2+ treatments)", "outcome metric"],
      assumptions: ["Random assignment across all variants", "Same eligibility for every variant"],
      limitations: ["Needs larger samples", "More variants = more correction = less power per comparison"],
      risks: ["Uncorrected comparisons inflate false positives"],
      alternatives: [
        { testId: "ab-test", name: "A/B Test", when: "If you can commit to a single best challenger" },
        { testId: "multivariate-test", name: "Multivariate Test", when: "If you need interaction effects between elements" },
      ],
      mvp: true,
    });
  }
  if (q.metricKind === "revenue") {
    return rec("revenue-per-user-test", "Revenue-per-User Test (Welch's t-test + bootstrap)", q, confidenceLevel, {
      why: "Revenue per user is continuous, right-skewed, and usually has unequal variances between groups. Welch's t-test is the safe default, with a bootstrap confidence interval as a robustness check against heavy tails.",
      question: "Does the treatment increase average revenue per user?",
      data: ["user_id", "variant", "revenue (0 for non-purchasers)", "exposure_timestamp"],
      assumptions: ["Random assignment", "Sample large enough for the CLT to make means well-behaved", "Outliers are genuine, not logging errors"],
      limitations: ["A few whales can dominate the result", "Median and mean can move in opposite directions"],
      risks: ["Outlier-driven false positives or negatives"],
      alternatives: [
        { testId: "mann-whitney-u", name: "Mann-Whitney U Test", when: "If the distribution is extremely skewed and you care about the typical user" },
        { testId: "bootstrap-test", name: "Bootstrap Test", when: "As the primary method for small or very heavy-tailed samples" },
      ],
      mvp: true,
    });
  }
  if (q.metricKind === "continuous" || q.metricKind === "engagement") {
    return rec("welch-t-test", "A/B Test with Welch's t-test", q, confidenceLevel, {
      why: "The primary metric is a continuous per-user value and two groups are being compared. Welch's t-test compares means without assuming equal variances — a safer default than the classic t-test for business metrics.",
      question: "Does the treatment change the average value of the metric per user?",
      data: ["user_id", "variant", "metric value", "exposure_timestamp"],
      assumptions: ["Random assignment", "Means approximately normal at the sample size used (CLT)", "Independent observations"],
      limitations: ["Sensitive to extreme outliers in small samples"],
      risks: ["Skewed metrics may need a bootstrap or non-parametric check"],
      alternatives: [
        { testId: "mann-whitney-u", name: "Mann-Whitney U Test", when: "If the metric is heavily skewed" },
        { testId: "bootstrap-test", name: "Bootstrap Test", when: "For heavy tails or small samples" },
      ],
      mvp: true,
    });
  }
  // Default: binary conversion A/B test.
  return rec("ab-test", "A/B Test with Two-Proportion Z-Test", q, confidenceLevel, {
    why: "One control is compared against one treatment, users can be randomly assigned, and the primary metric is binary conversion — the textbook case for a two-proportion z-test.",
    question: "Does the treatment change the conversion rate relative to control?",
    data: ["user_id", "variant", "converted (0/1)", "exposure_timestamp"],
    assumptions: [
      "Users are randomly assigned and appear in exactly one group",
      "Enough conversions and non-conversions in each group (roughly 10+ of each)",
      "Metric logged identically for both groups",
    ],
    limitations: ["Not ideal for tiny samples", "Says nothing about downstream quality of conversions"],
    risks: ["Sample ratio mismatch invalidates results", "Peeking at p-values inflates false positives"],
    alternatives: [
      { testId: "bayesian-ab-test", name: "Bayesian A/B Test", when: "If stakeholders want 'probability treatment is better' instead of p-values" },
      { testId: "sequential-test", name: "Sequential Test", when: "If the team needs to monitor results mid-flight" },
      { testId: "chi-square-test", name: "Chi-Square Test", when: "If the outcome has more than two categories" },
    ],
    mvp: true,
  });
}

interface RecParts {
  why: string;
  question: string;
  data: string[];
  assumptions: string[];
  limitations: string[];
  risks: string[];
  alternatives: { testId: string; name: string; when: string }[];
  mvp: boolean;
}

function rec(testId: string, testName: string, q: ExperimentQuestion, confidence: number, p: RecParts): TestRecommendation {
  return {
    testId,
    testName,
    whyThisFits: p.why,
    questionAnswered: p.question,
    requiredData: p.data,
    assumptions: p.assumptions,
    limitations: p.limitations,
    risks: p.risks,
    alternatives: p.alternatives,
    confidenceLevel: confidence,
    mvpSupported: p.mvp,
    whyRecommendedLong: `${p.why} The hypothesis predicts a directional change in ${q.primaryKpi.toLowerCase()}, which is a ${q.metricKind} metric — that metric type drives the choice of statistical method. This recommendation can be wrong if random assignment is not actually possible, if the randomization unit differs from the unit of analysis, or if treated and control units interfere with each other. In those cases, review the alternatives listed below.${p.mvp ? "" : " Note: this design is recognized and explained by the platform, but automated analysis for it is not yet available in the MVP — the platform will guide the setup and you can analyze externally or use a supported approximation."}`,
  };
}
