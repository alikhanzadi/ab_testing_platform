"use client";

// Renders validation issues, statistical results, and interpretation.
// Shared by the guided workflow and the standalone Analyze page.

import Link from "next/link";
import type { Interpretation, SegmentResult, StatisticalResult, ValidationIssue } from "@/lib/types";
import { fmtNum, fmtP } from "@/lib/interpret";
import { Badge, Banner, Card, CiBar, Expandable, SectionTitle } from "./ui";
import { bayesianBinary } from "@/lib/stats";

const pct = (x: number | undefined, d = 1) => (x === undefined || !Number.isFinite(x) ? "n/a" : `${(x * 100).toFixed(d)}%`);

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  return (
    <div className="space-y-3">
      {critical.length === 0 && warnings.length === 0 && (
        <Banner tone="success" title="Data validation passed">
          No blocking issues detected. {infos.length > 0 ? "Informational notes are listed below." : ""}
        </Banner>
      )}
      {[...critical, ...warnings, ...infos].map((issue) => (
        <div key={issue.id} className={`rounded-lg border p-4 text-sm ${issue.severity === "critical" ? "border-red-200 bg-red-50/60" : issue.severity === "warning" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800">{issue.title}</p>
            <Badge tone={issue.severity === "critical" ? "red" : issue.severity === "warning" ? "amber" : "slate"}>
              {issue.severity}{issue.affectedRows > 0 ? ` · ${issue.affectedRows.toLocaleString()} rows` : ""}
            </Badge>
          </div>
          <p className="mt-1 text-slate-600">{issue.detail}</p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium">Why it matters:</span> {issue.whyItMatters}{" "}
            <span className="font-medium">Suggested fix:</span> {issue.suggestedFix}
          </p>
          {issue.blocksAnalysis && <p className="mt-1 text-xs font-semibold text-red-600">Analysis cannot continue until this is resolved.</p>}
        </div>
      ))}
    </div>
  );
}

export function ResultsPanel({ result, confidenceLevel = 0.95 }: { result: StatisticalResult; confidenceLevel?: number }) {
  const isBinary = result.metricKind === "binary";
  const best = result.comparisons[0];

  // Optional Bayesian view for binary two-group results
  let bayes: ReturnType<typeof bayesianBinary> | null = null;
  if (isBinary && result.comparisons.length === 1) {
    const c = result.groups.find((g) => g.variant === best.control);
    const t = result.groups.find((g) => g.variant === best.treatment);
    if (c && t && c.conversions !== undefined && t.conversions !== undefined) {
      bayes = bayesianBinary(c.conversions, c.n, t.conversions, t.n);
    }
  }

  return (
    <div className="space-y-5">
      {result.srm.mismatch && (
        <Banner tone="critical" title="Sample ratio mismatch detected">
          Observed split {result.srm.actualCounts.join(" / ")} deviates from the expected split (p {fmtP(result.srm.pValue)}). Sample ratio mismatch may indicate assignment,
          logging, or data pipeline issues. Do not trust the result until this is investigated.
        </Banner>
      )}

      <Card>
        <SectionTitle sub={`Method: ${result.method}`}>Group results</SectionTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-4">Variant</th>
              <th className="pb-2 pr-4">Units</th>
              {isBinary ? (
                <>
                  <th className="pb-2 pr-4">Conversions</th>
                  <th className="pb-2">Rate</th>
                </>
              ) : (
                <>
                  <th className="pb-2 pr-4">Mean</th>
                  <th className="pb-2 pr-4">Median</th>
                  <th className="pb-2">Std Dev</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {result.groups.map((g) => (
              <tr key={g.variant} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-slate-800">{g.variant}</td>
                <td className="py-2 pr-4 text-slate-600">{g.n.toLocaleString()}</td>
                {isBinary ? (
                  <>
                    <td className="py-2 pr-4 text-slate-600">{g.conversions?.toLocaleString()}</td>
                    <td className="py-2 font-medium text-slate-800">{pct(g.rate, 2)}</td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-4 font-medium text-slate-800">{fmtNum(g.mean)}</td>
                    <td className="py-2 pr-4 text-slate-600">{fmtNum(g.median)}</td>
                    <td className="py-2 text-slate-600">{fmtNum(g.stdDev)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionTitle sub={`Confidence intervals at the ${pct(confidenceLevel, 0)} level. An interval crossing zero means the data is consistent with no effect.`}>
          Comparisons vs control
        </SectionTitle>
        <div className="space-y-4">
          {result.comparisons.map((c) => (
            <div key={c.treatment} className="rounded-lg border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {c.treatment} <span className="font-normal text-slate-400">vs</span> {c.control}
                </p>
                <div className="flex items-center gap-2">
                  {c.pValueAdjusted !== undefined && <Badge tone="violet">adjusted p {fmtP(c.pValueAdjusted)}</Badge>}
                  <Badge tone={c.significant ? (c.relativeLift > 0 ? "green" : "red") : "slate"}>
                    {c.significant ? (c.relativeLift > 0 ? "Significant lift" : "Significant decline") : "Not significant"}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">Absolute lift</p>
                  <p className="font-medium text-slate-800">{isBinary ? pct(c.absoluteLift, 2) : fmtNum(c.absoluteLift)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Relative lift</p>
                  <p className={`font-medium ${c.relativeLift > 0 ? "text-emerald-700" : c.relativeLift < 0 ? "text-red-700" : "text-slate-800"}`}>{pct(c.relativeLift)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">p-value</p>
                  <p className="font-medium text-slate-800">{fmtP(c.pValue).replace("= ", "")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Std error</p>
                  <p className="font-medium text-slate-800">{isBinary ? pct(c.standardError, 2) : fmtNum(c.standardError)}</p>
                </div>
              </div>
              <div className="mt-3">
                <CiBar
                  low={c.ciLow}
                  high={c.ciHigh}
                  estimate={c.absoluteLift}
                  label={`${pct(confidenceLevel, 0)} CI for absolute difference`}
                  formatValue={(x) => (isBinary ? pct(x, 2) : fmtNum(x))}
                />
                {c.bootstrapCi && (
                  <CiBar
                    low={c.bootstrapCi[0]}
                    high={c.bootstrapCi[1]}
                    estimate={c.absoluteLift}
                    label="Bootstrap CI (robust to outliers)"
                    formatValue={(x) => fmtNum(x)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {result.multipleComparisonNote && <p className="mt-3 text-xs text-slate-500">{result.multipleComparisonNote}</p>}
      </Card>

      {bayes && (
        <Expandable title="Bayesian view (optional): probability the treatment is better">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">P(treatment better)</p>
              <p className="text-lg font-semibold text-slate-800">{pct(bayes.probTreatmentBetter)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Expected relative lift</p>
              <p className="text-lg font-semibold text-slate-800">{pct(bayes.expectedLift)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400">95% credible interval (relative lift)</p>
              <p className="text-lg font-semibold text-slate-800">
                {pct(bayes.credibleLow)} to {pct(bayes.credibleHigh)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Bayesian probability is not the same as a frequentist p-value: this is the probability the treatment is better given the data and a neutral prior
            (Beta(1,1)). Learn more in the{" "}
            <Link href="/guide/bayesian-ab-test" className="text-blue-600 hover:underline">
              Bayesian A/B Testing guide
            </Link>
            .
          </p>
        </Expandable>
      )}

      <Card>
        <SectionTitle>Sample ratio check</SectionTitle>
        <p className="text-sm text-slate-600">
          Observed counts: {result.srm.variants.map((v, i) => `${v}: ${result.srm.actualCounts[i].toLocaleString()}`).join(" · ")}. Chi-square{" "}
          {result.srm.chiSquare.toFixed(2)}, p {fmtP(result.srm.pValue)} —{" "}
          {result.srm.mismatch ? (
            <span className="font-semibold text-red-600">mismatch detected. Investigate before trusting any result.</span>
          ) : (
            <span className="text-emerald-700">no mismatch detected.</span>
          )}{" "}
          <Link href="/guide/sample-ratio-mismatch" className="text-blue-600 hover:underline">
            Why this check matters
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function SegmentsPanel({ segments }: { segments: SegmentResult[] }) {
  if (segments.length === 0) return null;
  return (
    <Card>
      <SectionTitle sub="Exploratory only. Testing many comparisons increases the chance of false positives — confirm any segment finding with a dedicated test.">
        Segment analysis
      </SectionTitle>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-4">Segment</th>
            <th className="pb-2 pr-4">Units</th>
            <th className="pb-2 pr-4">Relative lift</th>
            <th className="pb-2 pr-4">p-value</th>
            <th className="pb-2">Signal</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.value} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-medium text-slate-800">{s.value}</td>
              <td className="py-2 pr-4 text-slate-600">{s.n.toLocaleString()}</td>
              <td className={`py-2 pr-4 font-medium ${s.lift > 0 ? "text-emerald-700" : s.lift < 0 ? "text-red-700" : "text-slate-700"}`}>{pct(s.lift)}</td>
              <td className="py-2 pr-4 text-slate-600">{fmtP(s.pValue).replace("= ", "")}</td>
              <td className="py-2">
                <Badge tone={s.significant ? "amber" : "slate"}>{s.significant ? "exploratory signal" : "none"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function InterpretationPanel({ interpretation }: { interpretation: Interpretation }) {
  const tone =
    interpretation.recommendation === "Ship" ? "success" : interpretation.recommendation === "Do Not Ship" || interpretation.recommendation === "Needs Better Data" ? "critical" : "info";
  return (
    <div className="space-y-4">
      <Banner tone={tone} title={interpretation.headline}>
        <span className="font-semibold">Recommendation: {interpretation.recommendation}.</span> {interpretation.recommendationDetail}
      </Banner>
      <Card>
        <SectionTitle>Statistical result</SectionTitle>
        <p className="text-sm leading-relaxed text-slate-600">{interpretation.statisticalResult}</p>
      </Card>
      <Card>
        <SectionTitle>Business interpretation</SectionTitle>
        <p className="text-sm leading-relaxed text-slate-600">{interpretation.businessInterpretation}</p>
      </Card>
      {interpretation.caveats.length > 0 && (
        <Card>
          <SectionTitle>Caveats</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {interpretation.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <SectionTitle>Next steps</SectionTitle>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {interpretation.nextSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
