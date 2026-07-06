import type { Interpretation, RecommendationOption, SegmentResult, StatisticalResult, ValidationIssue } from "./types";

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

export function interpretResult(
  result: StatisticalResult,
  opts: {
    validationIssues?: ValidationIssue[];
    segments?: SegmentResult[];
    confidenceLevel?: number;
    practicalThresholdRel?: number;
  } = {}
): Interpretation {
  const conf = opts.confidenceLevel ?? 0.95;
  const practical = opts.practicalThresholdRel ?? 0.02;
  const best = [...result.comparisons].sort((a, b) => b.relativeLift - a.relativeLift)[0];
  const liftTxt = Number.isFinite(best.relativeLift) ? pct(best.relativeLift) : "n/a";
  const direction = best.relativeLift >= 0 ? "increased" : "decreased";
  const metricLabel = result.metricKind === "binary" ? "the conversion rate" : result.metricKind === "revenue" ? "revenue per user" : "the average metric value";

  const caveats: string[] = [];
  const nextSteps: string[] = [];
  let recommendation: RecommendationOption;
  let recommendationDetail: string;
  let headline: string;

  const criticalIssues = (opts.validationIssues ?? []).filter((i) => i.severity === "critical");
  if (criticalIssues.length > 0) {
    caveats.push(`Data quality flags were raised during validation (${criticalIssues.map((i) => i.title.toLowerCase()).join("; ")}). Findings below are conditional on those being resolved or accepted.`);
  }

  const statistical = buildStatisticalNarrative(result, best, conf);

  switch (result.classification) {
    case "significant-meaningful":
      headline = `Treatment ${direction} ${metricLabel} by ${liftTxt} — statistically significant and practically meaningful.`;
      recommendation = "Ship";
      recommendationDetail = `The observed lift clears both the statistical bar (p ${fmtP(best.pValueAdjusted ?? best.pValue)} at the ${pct(conf, 0)} confidence level) and the practical significance threshold (${pct(practical, 0)} relative). Ship to 100% of eligible traffic while monitoring guardrails during rollout.`;
      nextSteps.push("Roll out gradually (e.g., 50% → 100%) while watching guardrail metrics.", "Document the result in the experiment registry.", "Plan a follow-up check for novelty decay after 4–6 weeks.");
      break;
    case "significant-not-meaningful":
      headline = `Treatment ${direction} ${metricLabel} by ${liftTxt} — statistically significant, but below the practical threshold.`;
      recommendation = "Iterate and Retest";
      recommendationDetail = `The effect is real but small (below the ${pct(practical, 0)} practical significance threshold). Statistical significance alone does not justify shipping if the business impact does not cover the cost of the change. Decide based on cost: if shipping is nearly free, it may still be worthwhile.`;
      caveats.push("With large samples, even trivial differences become statistically significant. Focus on effect size, not the p-value.");
      nextSteps.push("Assess whether the small lift justifies engineering and maintenance cost.", "Consider a bolder variant that could produce a larger effect.");
      break;
    case "meaningful-not-significant":
      headline = `Treatment showed a ${liftTxt} ${direction === "increased" ? "lift" : "decline"} in ${metricLabel}, but the result is not statistically significant.`;
      recommendation = "Continue Test";
      recommendationDetail = `The observed effect would matter if real, but at the ${pct(conf, 0)} confidence level it may be random variation. The confidence interval (${pct(bestCiLowRel(result, best))} to ${pct(bestCiHighRel(result, best))} relative) still includes zero. Continue collecting data if feasible.`;
      caveats.push("Do not repeatedly check p-values and stop when the result looks good unless sequential correction is used.");
      nextSteps.push("Continue the test to its planned sample size.", "If traffic is exhausted, treat as inconclusive rather than a win.");
      break;
    case "underpowered":
      headline = `The test appears underpowered — an observed ${liftTxt} change in ${metricLabel} could not be confirmed.`;
      recommendation = "Continue Test";
      recommendationDetail = "The sample collected is below the size needed to reliably detect an effect of this magnitude. This means the observed lift may be due to random variation. The test should be considered inconclusive rather than a failed treatment.";
      caveats.push("Underpowered tests are more likely to be inconclusive, and significant results from underpowered tests tend to overestimate the true effect.");
      nextSteps.push("Extend the test duration or widen the audience.", "Alternatively, use a more sensitive metric or a variance-reduction method such as CUPED.");
      break;
    case "harmful":
      headline = `Treatment significantly decreased ${metricLabel} by ${pct(Math.abs(best.relativeLift))}.`;
      recommendation = "Do Not Ship";
      recommendationDetail = "The treatment performed significantly worse than control. Do not ship. A negative result is still valuable: it prevented a harmful rollout.";
      nextSteps.push("Document the learning and share with the team.", "Investigate why the change hurt before designing a follow-up.");
      break;
    case "data-quality-issue":
      headline = "A data quality issue (sample ratio mismatch) blocks trustworthy interpretation.";
      recommendation = "Needs Better Data";
      recommendationDetail = `The observed split across variants deviates far from the expected split (SRM chi-square p = ${fmtP(result.srm.pValue)}). Sample ratio mismatch may indicate assignment, logging, or data pipeline issues. Do not trust the result until this is investigated.`;
      nextSteps.push("Audit the assignment system, bot filtering, and event logging.", "Rerun the experiment once the pipeline issue is fixed.");
      break;
    case "needs-more-data":
      headline = `No reliable effect detected yet — the sample is too small to conclude.`;
      recommendation = "Continue Test";
      recommendationDetail = "The sample size is small and the observed difference is within the range of random noise. More data is required before any decision.";
      nextSteps.push("Continue the test to the planned sample size from the power analysis.");
      break;
    default:
      headline = `No statistically significant difference in ${metricLabel} was detected (observed change: ${liftTxt}).`;
      recommendation = "Inconclusive";
      recommendationDetail = `The test reached a reasonable sample size but found no significant difference. This is evidence that any true effect is likely smaller than the test could detect — not proof of exactly zero effect.`;
      nextSteps.push("Decide by default: keep control (cheaper) unless the treatment has other benefits.", "If a smaller effect still matters, plan a larger or more sensitive test (e.g., CUPED).");
  }

  // Segment commentary
  const sigSegments = (opts.segments ?? []).filter((s) => s.significant);
  if ((opts.segments ?? []).length > 0) {
    caveats.push(
      sigSegments.length > 0
        ? `Segment differences were observed (${sigSegments.map((s) => `${s.value}: ${pct(s.lift)}`).join(", ")}). Treat these as exploratory — segment cuts multiply comparisons and inflate false positive risk. Confirm any segment effect with a dedicated follow-up test.`
        : "No significant segment-level differences were found. Segment views are exploratory only."
    );
  }
  if (result.multipleComparisonNote) caveats.push(result.multipleComparisonNote);
  if (result.srm.pValue >= 0.001 && result.srm.pValue < 0.01) caveats.push("The variant split is mildly imbalanced (borderline SRM). Verify assignment logging.");

  return {
    headline,
    statisticalResult: statistical,
    businessInterpretation: buildBusinessNarrative(result, best, recommendation),
    recommendation,
    recommendationDetail,
    caveats,
    nextSteps,
  };
}

function buildStatisticalNarrative(result: StatisticalResult, best: (typeof result.comparisons)[number], conf: number): string {
  const parts: string[] = [];
  if (result.metricKind === "binary") {
    const c = result.groups.find((g) => g.variant === best.control)!;
    const t = result.groups.find((g) => g.variant === best.treatment)!;
    parts.push(
      `Control converted at ${pct(c.rate ?? 0, 2)} (${c.conversions}/${c.n}) and treatment at ${pct(t.rate ?? 0, 2)} (${t.conversions}/${t.n}).`,
      `Absolute lift: ${pct(best.absoluteLift, 2)} (relative ${pct(best.relativeLift)}).`,
      `${result.method}: statistic ${best.statistic.toFixed(2)}, p ${fmtP(best.pValueAdjusted ?? best.pValue)}, ${pct(conf, 0)} CI for the absolute lift [${pct(best.ciLow, 2)}, ${pct(best.ciHigh, 2)}].`
    );
  } else {
    const c = result.groups.find((g) => g.variant === best.control)!;
    const t = result.groups.find((g) => g.variant === best.treatment)!;
    parts.push(
      `Control mean ${fmtNum(c.mean)} (median ${fmtNum(c.median)}, n=${c.n}); treatment mean ${fmtNum(t.mean)} (median ${fmtNum(t.median)}, n=${t.n}).`,
      `Difference in means: ${fmtNum(best.absoluteLift)} (relative ${pct(best.relativeLift)}).`,
      `${result.method}: t ${best.statistic.toFixed(2)}, p ${fmtP(best.pValueAdjusted ?? best.pValue)}, ${pct(conf, 0)} CI [${fmtNum(best.ciLow)}, ${fmtNum(best.ciHigh)}]${best.effectSize !== undefined ? `, Cohen's d ${best.effectSize.toFixed(2)}` : ""}.`
    );
    if (best.bootstrapCi) parts.push(`Bootstrap ${pct(conf, 0)} CI (robust to outliers): [${fmtNum(best.bootstrapCi[0])}, ${fmtNum(best.bootstrapCi[1])}].`);
  }
  parts.push(`Sample ratio check: chi-square ${result.srm.chiSquare.toFixed(2)}, p ${fmtP(result.srm.pValue)} — ${result.srm.mismatch ? "MISMATCH DETECTED" : "no mismatch detected"}.`);
  return parts.join(" ");
}

function buildBusinessNarrative(result: StatisticalResult, best: (typeof result.comparisons)[number], rec: RecommendationOption): string {
  const better = best.relativeLift > 0;
  switch (rec) {
    case "Ship":
      return `The treatment outperformed control by a margin large enough to matter for the business, and the evidence is strong enough to act on. The main remaining risk is that the effect decays over time (novelty), which post-launch monitoring will catch.`;
    case "Do Not Ship":
      return `The treatment made the primary metric worse. Keeping control protects the business; the learning should inform the next iteration.`;
    case "Needs Better Data":
      return `No business conclusion should be drawn until the data pipeline issue is resolved — the groups being compared may not be comparable.`;
    default:
      return better
        ? `The treatment looks directionally positive, but the evidence does not yet support a confident ship decision. Acting now would carry meaningful risk of shipping a no-op.`
        : `There is no evidence the treatment helps. Unless it carries other benefits (cost, simplicity, speed), control remains the default choice.`;
  }
}

function bestCiLowRel(result: StatisticalResult, best: { ciLow: number; control: string }): number {
  const c = result.groups.find((g) => g.variant === best.control);
  const base = result.metricKind === "binary" ? c?.rate ?? 0 : c?.mean ?? 0;
  return base === 0 ? NaN : best.ciLow / base;
}
function bestCiHighRel(result: StatisticalResult, best: { ciHigh: number; control: string }): number {
  const c = result.groups.find((g) => g.variant === best.control);
  const base = result.metricKind === "binary" ? c?.rate ?? 0 : c?.mean ?? 0;
  return base === 0 ? NaN : best.ciHigh / base;
}

export function fmtP(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  return `= ${p.toFixed(4)}`;
}

export function fmtNum(x: number | undefined): string {
  if (x === undefined || !Number.isFinite(x)) return "n/a";
  if (Math.abs(x) >= 1000) return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(x) >= 10) return x.toFixed(1);
  return x.toFixed(3);
}
