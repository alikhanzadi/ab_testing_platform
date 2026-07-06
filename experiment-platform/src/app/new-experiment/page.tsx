"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Banner, Button, Card, Expandable, Field, KV, SectionTitle, inputCls } from "@/components/ui";
import CsvUploader from "@/components/CsvUploader";
import { InterpretationPanel, ResultsPanel, SegmentsPanel, ValidationPanel } from "@/components/AnalysisResults";
import { analyzeQuestion, buildHypothesis, frameproblem, recommendTest } from "@/lib/guidance";
import { runPowerAnalysis } from "@/lib/power";
import { validateDataset } from "@/lib/validate";
import { analyzeDataset } from "@/lib/analyze";
import { interpretResult } from "@/lib/interpret";
import { generateReportMarkdown, markdownToHtml, download } from "@/lib/report";
import { getExperiment, getSettings, newExperiment, saveExperiment, saveReport } from "@/lib/storage";
import type { Experiment, MetricDefinition, ParsedDataset, PowerInputs, Severity } from "@/lib/types";

const STEPS = [
  "Ask the Question",
  "Frame the Problem",
  "Build the Hypothesis",
  "Select the Right Test",
  "Design the Experiment",
  "Define Metrics",
  "Sample Size & Power",
  "Upload CSV Data",
  "Validate Data",
  "Analyze Results",
  "Interpret Findings",
  "Generate Report",
];

const EXAMPLE_QUESTIONS = [
  "Will changing the onboarding email subject line increase activation?",
  "Does a new landing page improve signup conversion?",
  "Will a discount increase first purchase conversion?",
  "Does a new recommendation module increase engagement?",
  "Will changing the checkout flow reduce cart abandonment?",
];

const SEVERITY_LABEL: Record<Severity, { label: string; tone: "green" | "amber" | "red" }> = {
  low: { label: "Low concern", tone: "green" },
  medium: { label: "Medium concern", tone: "amber" },
  high: { label: "High concern", tone: "red" },
  "not-recommended": { label: "Experiment not recommended", tone: "red" },
};

function WorkflowInner() {
  const searchParams = useSearchParams();
  const existingId = searchParams.get("id");
  const [exp, setExp] = useState<Experiment | null>(null);
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const settings = useMemo(() => getSettings(), []);

  useEffect(() => {
    const loaded = existingId ? getExperiment(existingId) : undefined;
    const e = loaded ?? newExperiment();
    setExp(e);
    setQuestionDraft(e.question?.raw ?? "");
  }, [existingId]);

  if (!exp) return null;

  const update = (patch: Partial<Experiment>) => {
    const next = { ...exp, ...patch };
    setExp(next);
    saveExperiment(next);
  };

  const goto = (step: number) => update({ step: Math.max(0, Math.min(STEPS.length - 1, step)) });

  // ---- step handlers ----

  const runQuestionAnalysis = () => {
    if (!questionDraft.trim()) return;
    const q = analyzeQuestion(questionDraft.trim());
    const framing = frameproblem(q);
    const hypothesis = buildHypothesis(q);
    const recommendation = recommendTest(q, settings.confidenceLevel);
    const design: Experiment["design"] = {
      experimentType: recommendation.testName,
      statisticalTest: recommendation.testName.includes("z-test") || q.metricKind === "binary" ? "Two-proportion z-test" : "Welch's t-test",
      control: q.currentExperience,
      treatment: q.proposedChange,
      numVariants: 2,
      audience: q.audience,
      inclusion: `All ${q.audience} exposed to the tested surface during the experiment window`,
      exclusion: "Internal/test accounts, bots, users exposed before the experiment start",
      randomizationUnit: "user",
      randomizationMethod: "Deterministic hash of user ID into stable 50/50 buckets at first exposure",
      split: "50 / 50",
      durationWeeks: 2,
      stoppingRules: "Run to the planned sample size from the power analysis. No early stopping on favorable p-values unless a sequential design is adopted before launch.",
      decisionRules: "Ship if the primary metric shows a significant lift above the practical threshold with clean guardrails; do not ship on significant harm; iterate on inconclusive.",
      rollout: "If successful: staged rollout 50% → 100% with guardrail monitoring.",
      warnings: [],
    };
    const metrics: MetricDefinition[] = [
      {
        id: "m1",
        name: q.primaryKpi,
        kind: q.metricKind,
        role: "primary",
        purpose: "Decides the experiment outcome",
        numerator: q.metricKind === "binary" ? "Units completing the target action" : `Total ${q.primaryKpi.toLowerCase()}`,
        denominator: q.metricKind === "binary" ? "Eligible exposed units" : "Exposed units",
        unitOfAnalysis: "user",
        eventSource: "Product analytics events",
        timeWindow: "Experiment window",
        inclusionLogic: "Exposed users only",
        exclusionLogic: "Bots, internal accounts",
        expectedDirection: "increase",
        owner: "Experiment owner",
        caveats: "Must be logged identically for both variants",
      },
      ...q.secondaryKpis.map((s, i) => ({
        id: `m${i + 2}`,
        name: s,
        kind: "continuous" as const,
        role: "secondary" as const,
        purpose: "Context and mechanism",
        numerator: s,
        denominator: "Exposed units",
        unitOfAnalysis: "user",
        eventSource: "Product analytics events",
        timeWindow: "Experiment window",
        inclusionLogic: "Exposed users only",
        exclusionLogic: "Bots, internal accounts",
        expectedDirection: "increase" as const,
        owner: "Experiment owner",
        caveats: "",
      })),
      ...q.guardrails.map((g, i) => ({
        id: `g${i + 1}`,
        name: g,
        kind: "binary" as const,
        role: "guardrail" as const,
        purpose: "Detect collateral damage",
        numerator: g,
        denominator: "Exposed units",
        unitOfAnalysis: "user",
        eventSource: "Product analytics events",
        timeWindow: "Experiment window (+7 days where relevant)",
        inclusionLogic: "Exposed users only",
        exclusionLogic: "Bots, internal accounts",
        expectedDirection: "no-change" as const,
        owner: "Experiment owner",
        caveats: "A significant regression here blocks shipping regardless of the primary metric",
      })),
    ];
    const powerInputs: PowerInputs = {
      metricKind: q.metricKind === "binary" || q.metricKind === "retention" ? "binary" : "continuous",
      baselineRate: q.metricKind === "binary" || q.metricKind === "retention" ? 0.08 : 50,
      stdDev: 25,
      mdeRelative: 0.1,
      alpha: 1 - settings.confidenceLevel,
      power: settings.power,
      allocation: settings.trafficSplit,
      weeklyTraffic: 20000,
      twoSided: true,
    };
    update({
      question: q,
      framing,
      hypothesis,
      recommendation,
      design,
      metrics,
      powerInputs,
      powerResult: runPowerAnalysis(powerInputs),
      status: "draft",
      step: 1,
    });
  };

  const onDatasetParsed = (ds: ParsedDataset) => {
    setDataset(ds);
    setAnalysisError(null);
    const issues = validateDataset(ds);
    update({
      datasetMeta: { fileName: ds.fileName, rowCount: ds.rowCount, columns: ds.columns },
      validationIssues: issues,
      result: undefined,
      interpretation: undefined,
      step: 8,
    });
  };

  const runAnalysis = () => {
    if (!dataset) return;
    const out = analyzeDataset(dataset, {
      alpha: 1 - settings.confidenceLevel,
      plannedSamplePerGroup: exp.powerResult?.samplePerGroup,
    });
    if ("error" in out) {
      setAnalysisError(out.error);
      return;
    }
    const interpretation = interpretResult(out.result, {
      validationIssues: exp.validationIssues,
      segments: out.segments,
      confidenceLevel: settings.confidenceLevel,
    });
    update({ result: out.result, segments: out.segments, interpretation, status: "analyzed", step: 9 });
  };

  const makeReport = () => {
    const md = generateReportMarkdown(exp);
    const title = exp.question?.refined ?? "Experiment report";
    saveReport({
      id: `rep_${Date.now().toString(36)}`,
      experimentId: exp.id,
      title,
      createdAt: new Date().toISOString(),
      markdown: md,
    });
    update({ reportMarkdown: md, status: "reported" });
  };

  const blocking = (exp.validationIssues ?? []).filter((i) => i.blocksAnalysis);

  // ---- render ----

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Experiment</h1>
        <p className="mt-1 text-sm text-slate-500">A guided workflow from business question to executive-ready report.</p>
      </div>

      {/* Stepper */}
      <div className="no-print overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
        <ol className="flex min-w-max items-center gap-1">
          {STEPS.map((label, i) => {
            const done = i < exp.step;
            const active = i === exp.step;
            const reachable = i <= exp.step || (exp.question !== undefined && i <= 7) || (exp.result !== undefined);
            return (
              <li key={label} className="flex items-center">
                {i > 0 && <div className={`h-px w-4 ${done ? "bg-blue-400" : "bg-slate-200"}`} />}
                <button
                  onClick={() => reachable && goto(i)}
                  disabled={!reachable}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-blue-600 text-white" : done ? "text-blue-700 hover:bg-blue-50" : reachable ? "text-slate-500 hover:bg-slate-50" : "cursor-default text-slate-300"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${active ? "bg-white/20" : done ? "bg-blue-100" : "bg-slate-100"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* STEP 0: Question */}
      {exp.step === 0 && (
        <Card>
          <SectionTitle sub="Describe what you want to learn in plain business language. The platform will refine it into a testable experimentation question.">
            What business question are you trying to answer?
          </SectionTitle>
          <textarea
            value={questionDraft}
            onChange={(e) => setQuestionDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Does a new landing page improve signup conversion?"
            className={inputCls}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button key={q} onClick={() => setQuestionDraft(q)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700">
                {q}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={runQuestionAnalysis} disabled={!questionDraft.trim()}>
              Analyze Question
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 1: Framing */}
      {exp.step === 1 && exp.question && exp.framing && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle sub="The platform rewrote your question into a testable form. Edit any field that doesn't match your intent.">Refined question</SectionTitle>
              <Badge tone={SEVERITY_LABEL[exp.framing.overallSeverity].tone}>{SEVERITY_LABEL[exp.framing.overallSeverity].label}</Badge>
            </div>
            <blockquote className="rounded-lg border-l-4 border-blue-500 bg-blue-50/60 px-4 py-3 text-sm font-medium text-slate-800">{exp.question.refined}</blockquote>
            {exp.question.raw !== exp.question.refined && <p className="mt-2 text-xs text-slate-400">Original: “{exp.question.raw}”</p>}
            <dl className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Business function" v={exp.question.businessFunction} />
              <KV k="Decision being tested" v={exp.question.decision} />
              <KV k="Target audience" v={exp.question.audience} />
              <KV k="Proposed change" v={exp.question.proposedChange} />
              <KV k="Primary KPI" v={`${exp.question.primaryKpi} (${exp.question.metricKind})`} />
              <KV k="Expected behavior change" v={exp.question.expectedBehaviorChange} />
              <KV k="Secondary KPIs" v={exp.question.secondaryKpis.join("; ") || "—"} />
              <KV k="Guardrail metrics" v={exp.question.guardrails.join("; ")} />
              <KV k="Data needed" v={exp.question.dataNeeded.join(", ")} />
              <KV k="Testable?" v={exp.question.testable ? `Yes — ${exp.question.testableReason}` : `No — ${exp.question.testableReason}`} />
            </dl>
          </Card>

          <Card>
            <SectionTitle>Problem framing</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Problem statement" v={exp.framing.problemStatement} />
              <KV k="Business context" v={exp.framing.businessContext} />
              <KV k="Why the experiment matters" v={exp.framing.whyItMatters} />
              <KV k="Decision after the test" v={exp.framing.decisionAfterTest} />
              <KV k="Risk of acting without testing" v={exp.framing.riskWithoutTesting} />
              <KV k="Risk of over-testing" v={exp.framing.riskOfOverTesting} />
              <KV k="Success looks like" v={exp.framing.successLooksLike} />
              <KV k="Inconclusive looks like" v={exp.framing.inconclusiveLooksLike} />
              <KV k="Harmful looks like" v={exp.framing.harmfulLooksLike} />
              <KV k="Baseline assumption" v={exp.framing.baselineAssumption} />
            </dl>
          </Card>

          {exp.framing.issues.length > 0 && (
            <Card>
              <SectionTitle sub="Address these before investing in the experiment.">Flagged concerns</SectionTitle>
              <div className="space-y-3">
                {exp.framing.issues.map((issue, i) => (
                  <Banner key={i} tone={issue.severity === "high" || issue.severity === "not-recommended" ? "critical" : "warning"} title={issue.issue}>
                    {issue.why} <span className="font-medium">Fix:</span> {issue.fix}
                  </Banner>
                ))}
              </div>
            </Card>
          )}

          <StepNav onBack={() => goto(0)} onNext={() => goto(2)} />
        </div>
      )}

      {/* STEP 2: Hypothesis */}
      {exp.step === 2 && exp.hypothesis && exp.recommendation && (
        <div className="space-y-4">
          <Card>
            <SectionTitle sub="A strong hypothesis names the change, the audience, the expected behavior, the KPI, and the reason.">Primary hypothesis</SectionTitle>
            <blockquote className="rounded-lg border-l-4 border-blue-500 bg-blue-50/60 px-4 py-3 text-sm font-medium text-slate-800">{exp.hypothesis.primary}</blockquote>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Null hypothesis (H0)" v={exp.hypothesis.nullHypothesis} />
              <KV k="Alternative hypothesis (H1)" v={exp.hypothesis.alternative} />
              <KV k="Directional expectation" v={exp.hypothesis.directional} />
              <KV k="MDE recommendation" v={exp.hypothesis.mdeRecommendation} />
              <KV k="Success criteria" v={exp.hypothesis.successCriteria} />
              <KV k="Failure criteria" v={exp.hypothesis.failureCriteria} />
              <KV k="Inconclusive criteria" v={exp.hypothesis.inconclusiveCriteria} />
              <KV k="Practical significance threshold" v={exp.hypothesis.practicalThreshold} />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Risk assumptions</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                {exp.hypothesis.riskAssumptions.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Expandable title="Why this test was recommended" defaultOpen>
            <p className="leading-relaxed">{exp.recommendation.whyRecommendedLong}</p>
            <p className="mt-3">
              <Link href={`/guide/${exp.recommendation.testId}`} className="font-medium text-blue-600 hover:underline">
                Learn about {exp.recommendation.testName} in the Experimentation Guide →
              </Link>
            </p>
          </Expandable>

          <StepNav onBack={() => goto(1)} onNext={() => goto(3)} />
        </div>
      )}

      {/* STEP 3: Test selection */}
      {exp.step === 3 && exp.recommendation && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle sub={exp.recommendation.whyThisFits}>Recommended: {exp.recommendation.testName}</SectionTitle>
              <Badge tone={exp.recommendation.mvpSupported ? "green" : "amber"}>{exp.recommendation.mvpSupported ? "Analysis supported in MVP" : "Guidance only in MVP"}</Badge>
            </div>
            <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Question it answers" v={exp.recommendation.questionAnswered} />
              <KV k="Required data" v={exp.recommendation.requiredData.join(", ")} />
              <KV k="Confidence level" v={`${(exp.recommendation.confidenceLevel * 100).toFixed(0)}%`} />
              <KV k="Assumptions" v={<ul className="list-disc pl-4">{exp.recommendation.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
              <KV k="Limitations" v={<ul className="list-disc pl-4">{exp.recommendation.limitations.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
              <KV k="Risks" v={<ul className="list-disc pl-4">{exp.recommendation.risks.map((a, i) => <li key={i}>{a}</li>)}</ul>} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={`/guide/${exp.recommendation.testId}`} className="font-medium text-blue-600 hover:underline">Learn about this test</Link>
              <Link href={`/guide/${exp.recommendation.testId}#example`} className="font-medium text-blue-600 hover:underline">See examples</Link>
              <Link href={`/guide/${exp.recommendation.testId}#assumptions`} className="font-medium text-blue-600 hover:underline">View assumptions</Link>
            </div>
          </Card>

          {exp.recommendation.alternatives.length > 0 && (
            <Card>
              <SectionTitle sub="Consider these if the recommended design's assumptions don't hold.">Alternative tests</SectionTitle>
              <div className="space-y-2">
                {exp.recommendation.alternatives.map((alt) => (
                  <div key={alt.testId} className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{alt.name}</p>
                      <p className="text-xs text-slate-500">{alt.when}</p>
                    </div>
                    <Link href={`/guide/${alt.testId}`} className="whitespace-nowrap text-xs font-medium text-blue-600 hover:underline">
                      Compare →
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <StepNav onBack={() => goto(2)} onNext={() => goto(4)} />
        </div>
      )}

      {/* STEP 4: Design */}
      {exp.step === 4 && exp.design && (
        <div className="space-y-4">
          <Card>
            <SectionTitle sub="Review and adjust the recommended design. These choices are recorded in the final report.">Experiment design</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Control group"><input className={inputCls} value={exp.design.control} onChange={(e) => update({ design: { ...exp.design!, control: e.target.value } })} /></Field>
              <Field label="Treatment group"><input className={inputCls} value={exp.design.treatment} onChange={(e) => update({ design: { ...exp.design!, treatment: e.target.value } })} /></Field>
              <Field label="Target audience"><input className={inputCls} value={exp.design.audience} onChange={(e) => update({ design: { ...exp.design!, audience: e.target.value } })} /></Field>
              <Field label="Randomization unit" hint="User-level prevents one person from seeing both experiences. Account-level suits B2B. Geo/time-block when users can't be split.">
                <select
                  className={inputCls}
                  value={exp.design.randomizationUnit}
                  onChange={(e) => update({ design: { ...exp.design!, randomizationUnit: e.target.value as NonNullable<Experiment["design"]>["randomizationUnit"] } })}
                >
                  {["user", "session", "account", "geo", "time-block", "cluster"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sample split"><input className={inputCls} value={exp.design.split} onChange={(e) => update({ design: { ...exp.design!, split: e.target.value } })} /></Field>
              <Field label="Planned duration (weeks)">
                <input type="number" min={1} className={inputCls} value={exp.design.durationWeeks} onChange={(e) => update({ design: { ...exp.design!, durationWeeks: Number(e.target.value) } })} />
              </Field>
              <Field label="Inclusion criteria"><input className={inputCls} value={exp.design.inclusion} onChange={(e) => update({ design: { ...exp.design!, inclusion: e.target.value } })} /></Field>
              <Field label="Exclusion criteria"><input className={inputCls} value={exp.design.exclusion} onChange={(e) => update({ design: { ...exp.design!, exclusion: e.target.value } })} /></Field>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Randomization method" v={exp.design.randomizationMethod} />
              <KV k="Stopping rules" v={exp.design.stoppingRules} />
              <KV k="Decision rules" v={exp.design.decisionRules} />
              <KV k="Rollout recommendation" v={exp.design.rollout} />
            </dl>
          </Card>

          {exp.design.randomizationUnit === "session" && (
            <Banner tone="warning" title="Session-level randomization risk">
              The same user can land in both variants across sessions, contaminating anything the user remembers. Prefer user-level randomization for visible UX changes.
            </Banner>
          )}

          <Expandable title="Common design mistakes this platform will hold you to">
            <ul className="list-disc space-y-1 pl-5">
              <li>Do not change targeting or the treatment mid-test — restart instead.</li>
              <li>Do not stop early because results look good (peeking inflates false positives).</li>
              <li>Do not ignore guardrail metrics or sample ratio mismatch.</li>
              <li>Do not test multiple unrelated changes in one variant.</li>
              <li>Do not launch during unusual seasonality if avoidable.</li>
              <li>Analyze only users who were actually exposed; no user should appear in both variants.</li>
            </ul>
          </Expandable>

          <StepNav onBack={() => goto(3)} onNext={() => goto(5)} />
        </div>
      )}

      {/* STEP 5: Metrics */}
      {exp.step === 5 && exp.metrics && (
        <div className="space-y-4">
          <Card>
            <SectionTitle sub="One primary metric decides the outcome. Secondary metrics explain mechanisms. Guardrails watch for collateral damage.">Metric definitions</SectionTitle>
            <div className="space-y-3">
              {exp.metrics.map((m, idx) => (
                <div key={m.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <input
                      className="w-1/2 rounded border-0 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      value={m.name}
                      onChange={(e) => {
                        const metrics = [...exp.metrics!];
                        metrics[idx] = { ...m, name: e.target.value };
                        update({ metrics });
                      }}
                    />
                    <Badge tone={m.role === "primary" ? "blue" : m.role === "guardrail" ? "amber" : "slate"}>{m.role}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <Field label="Numerator">
                      <input className={inputCls} value={m.numerator} onChange={(e) => { const metrics = [...exp.metrics!]; metrics[idx] = { ...m, numerator: e.target.value }; update({ metrics }); }} />
                    </Field>
                    <Field label="Denominator">
                      <input className={inputCls} value={m.denominator} onChange={(e) => { const metrics = [...exp.metrics!]; metrics[idx] = { ...m, denominator: e.target.value }; update({ metrics }); }} />
                    </Field>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Type: {m.kind} · Unit: {m.unitOfAnalysis} · Window: {m.timeWindow}
                    {m.caveats ? ` · ${m.caveats}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Banner tone="info" title="Metric hygiene checks">
            The platform will warn during analysis if the metric is unavailable in the uploaded data, if the unit of analysis doesn&apos;t match the randomization unit, or if numerator/denominator are ambiguous. Also watch for metrics that can be gamed or arrive too late to be useful — see{" "}
            <Link href="/guide/metric-design" className="font-medium underline">Metric Design Principles</Link>.
          </Banner>

          <StepNav onBack={() => goto(4)} onNext={() => goto(6)} />
        </div>
      )}

      {/* STEP 6: Power */}
      {exp.step === 6 && exp.powerInputs && (
        <PowerStep exp={exp} update={update} onBack={() => goto(5)} onNext={() => goto(7)} />
      )}

      {/* STEP 7: Upload */}
      {exp.step === 7 && (
        <div className="space-y-4">
          <Card>
            <SectionTitle sub="After the experiment has run, upload the results as CSV. One row per unit is ideal; duplicates are handled with warnings.">Upload experiment data</SectionTitle>
            <CsvUploader onParsed={onDatasetParsed} />
            {exp.datasetMeta && !dataset && (
              <Banner tone="info" title={`Previously uploaded: ${exp.datasetMeta.fileName}`}>
                {exp.datasetMeta.rowCount.toLocaleString()} rows. CSV contents are not persisted between sessions — re-upload the file to re-run analysis.
              </Banner>
            )}
          </Card>
          <p className="text-xs text-slate-400">
            Need a starting format? Download a matching template from the <Link href="/templates" className="text-blue-600 hover:underline">Templates</Link> page.
          </p>
          <StepNav onBack={() => goto(6)} onNext={dataset || exp.validationIssues ? () => goto(8) : undefined} nextLabel="Validate Data" />
        </div>
      )}

      {/* STEP 8: Validate */}
      {exp.step === 8 && (
        <div className="space-y-4">
          {exp.validationIssues ? (
            <>
              <ValidationPanel issues={exp.validationIssues} />
              {blocking.length > 0 ? (
                <Banner tone="critical" title="Analysis blocked">
                  Resolve the critical issues above and re-upload the corrected file.
                </Banner>
              ) : (
                <Banner tone="success" title="Ready to analyze">
                  {dataset ? "Validation passed with no blocking issues." : "Re-upload the CSV to run the analysis (file contents are not persisted)."}
                </Banner>
              )}
            </>
          ) : (
            <Banner tone="info">Upload a CSV first.</Banner>
          )}
          <StepNav onBack={() => goto(7)} onNext={dataset && blocking.length === 0 ? runAnalysis : undefined} nextLabel="Run Analysis" />
          {analysisError && <Banner tone="critical" title="Analysis error">{analysisError}</Banner>}
        </div>
      )}

      {/* STEP 9: Results */}
      {exp.step === 9 && exp.result && (
        <div className="space-y-4">
          <ResultsPanel result={exp.result} confidenceLevel={settings.confidenceLevel} />
          {exp.segments && <SegmentsPanel segments={exp.segments} />}
          <StepNav onBack={() => goto(8)} onNext={() => goto(10)} nextLabel="Interpret Findings" />
        </div>
      )}

      {/* STEP 10: Interpretation */}
      {exp.step === 10 && exp.interpretation && (
        <div className="space-y-4">
          <InterpretationPanel interpretation={exp.interpretation} />
          <StepNav onBack={() => goto(9)} onNext={() => goto(11)} nextLabel="Generate Report" />
        </div>
      )}

      {/* STEP 11: Report */}
      {exp.step === 11 && (
        <div className="space-y-4">
          {!exp.reportMarkdown ? (
            <Card className="text-center">
              <p className="text-sm text-slate-600">Generate a polished, executive-ready report from everything recorded in this workflow.</p>
              <div className="mt-4">
                <Button onClick={makeReport}>Generate Report</Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="no-print flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => download("experiment-report.md", exp.reportMarkdown!, "text/markdown")}>Download Markdown</Button>
                <Button variant="secondary" onClick={() => download("experiment-report.html", markdownToHtml(exp.reportMarkdown!), "text/html")}>Download HTML</Button>
                <Button variant="secondary" onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.write(markdownToHtml(exp.reportMarkdown!)); w.document.close(); w.print(); } }}>
                  Print / Save as PDF
                </Button>
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(exp.reportMarkdown!)}>Copy Text</Button>
                <Button variant="ghost" onClick={makeReport}>Regenerate</Button>
              </div>
              <Card>
                <div className="prose-report" dangerouslySetInnerHTML={{ __html: markdownToHtml(exp.reportMarkdown).replace(/^[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*$/, "") }} />
              </Card>
            </>
          )}
          <StepNav onBack={() => goto(10)} />
        </div>
      )}
    </div>
  );
}

function StepNav({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="no-print flex items-center justify-between">
      <div>{onBack && <Button variant="ghost" onClick={onBack}>← Back</Button>}</div>
      <div>{onNext && <Button onClick={onNext}>{nextLabel} →</Button>}</div>
    </div>
  );
}

function PowerStep({ exp, update, onBack, onNext }: { exp: Experiment; update: (p: Partial<Experiment>) => void; onBack: () => void; onNext: () => void }) {
  const pi = exp.powerInputs!;
  const setPi = (patch: Partial<PowerInputs>) => {
    const next = { ...pi, ...patch };
    update({ powerInputs: next, powerResult: runPowerAnalysis(next) });
  };
  const p = exp.powerResult;
  const isBinary = pi.metricKind === "binary";
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle sub="Estimate how much sample and time the test needs. Defaults: 95% confidence, 80% power, 50/50 split, two-sided.">Sample size & power</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Metric type">
            <select className={inputCls} value={pi.metricKind} onChange={(e) => setPi({ metricKind: e.target.value as "binary" | "continuous" })}>
              <option value="binary">Binary conversion</option>
              <option value="continuous">Continuous metric</option>
            </select>
          </Field>
          <Field label={isBinary ? "Baseline conversion rate" : "Baseline mean"} hint={isBinary ? "e.g. 0.08 = 8%" : "current average value"}>
            <input type="number" step="0.01" className={inputCls} value={pi.baselineRate} onChange={(e) => setPi({ baselineRate: Number(e.target.value) })} />
          </Field>
          {!isBinary && (
            <Field label="Standard deviation" hint="of the metric across users">
              <input type="number" step="0.1" className={inputCls} value={pi.stdDev} onChange={(e) => setPi({ stdDev: Number(e.target.value) })} />
            </Field>
          )}
          <Field label="Minimum detectable effect (relative)" hint="e.g. 0.10 = detect a 10% relative lift">
            <input type="number" step="0.01" className={inputCls} value={pi.mdeRelative} onChange={(e) => setPi({ mdeRelative: Number(e.target.value) })} />
          </Field>
          <Field label="Significance level (alpha)">
            <input type="number" step="0.01" className={inputCls} value={pi.alpha} onChange={(e) => setPi({ alpha: Number(e.target.value) })} />
          </Field>
          <Field label="Power" hint="0.80 = 80% chance of detecting a true effect of the MDE size">
            <input type="number" step="0.05" className={inputCls} value={pi.power} onChange={(e) => setPi({ power: Number(e.target.value) })} />
          </Field>
          <Field label="Treatment allocation" hint="0.5 = 50/50 split">
            <input type="number" step="0.05" min="0.05" max="0.95" className={inputCls} value={pi.allocation} onChange={(e) => setPi({ allocation: Number(e.target.value) })} />
          </Field>
          <Field label="Weekly eligible traffic">
            <input type="number" step="1000" className={inputCls} value={pi.weeklyTraffic} onChange={(e) => setPi({ weeklyTraffic: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      {p && (
        <Card>
          <SectionTitle>Estimate</SectionTitle>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Sample per group</p>
              <p className="text-2xl font-semibold text-slate-900">{Number.isFinite(p.samplePerGroup) ? p.samplePerGroup.toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total sample</p>
              <p className="text-2xl font-semibold text-slate-900">{Number.isFinite(p.totalSample) ? p.totalSample.toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Estimated duration</p>
              <p className="text-2xl font-semibold text-slate-900">{Number.isFinite(p.estimatedWeeks) ? `${p.estimatedWeeks} wk` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Feasible?</p>
              <p className={`text-2xl font-semibold ${p.feasible ? "text-emerald-600" : "text-red-600"}`}>{p.feasible ? "Likely" : "Doubtful"}</p>
            </div>
          </div>
          {p.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {p.warnings.map((w, i) => (
                <Banner key={i} tone="warning">{w}</Banner>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Smaller effects require larger samples; halving the MDE roughly quadruples the required sample. Lower traffic means longer duration. Underpowered
            tests are more likely to be inconclusive — and statistical significance does not always mean business significance.
          </p>
        </Card>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue to Upload" />
    </div>
  );
}

export default function NewExperimentPage() {
  return (
    <Suspense fallback={null}>
      <WorkflowInner />
    </Suspense>
  );
}
