import type { Experiment } from "./types";
import { fmtNum, fmtP } from "./interpret";

const pct = (x: number | undefined, d = 1) => (x === undefined || !Number.isFinite(x) ? "n/a" : `${(x * 100).toFixed(d)}%`);

export function generateReportMarkdown(exp: Experiment): string {
  const q = exp.question;
  const f = exp.framing;
  const h = exp.hypothesis;
  const rec = exp.recommendation;
  const d = exp.design;
  const p = exp.powerResult;
  const pi = exp.powerInputs;
  const r = exp.result;
  const interp = exp.interpretation;
  const date = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  const add = (s = "") => lines.push(s);

  add(`# Experiment Report: ${q?.primaryKpi ?? "Experiment"} — ${q?.proposedChange ?? ""}`);
  add();
  add(`*Generated ${date} · Status: ${exp.status}*`);
  add();

  add(`## Executive Summary`);
  add();
  if (interp && r) {
    add(interp.headline);
    add();
    add(`**Recommendation: ${interp.recommendation}.** ${interp.recommendationDetail}`);
  } else {
    add(`This experiment is in the ${exp.status} stage. Analysis has not been completed yet.`);
  }
  add();

  if (q) {
    add(`## Business Question`);
    add();
    add(`> ${q.refined}`);
    add();
    add(`- **Business function:** ${q.businessFunction}`);
    add(`- **Decision being tested:** ${q.decision}`);
    add(`- **Audience:** ${q.audience}`);
    add(`- **Proposed change:** ${q.proposedChange}`);
    add(`- **Primary KPI:** ${q.primaryKpi}`);
    add();
  }

  if (f) {
    add(`## Problem Statement`);
    add();
    add(f.problemStatement);
    add();
    add(`**Why this matters:** ${f.whyItMatters}`);
    add();
    add(`**Decision after the test:** ${f.decisionAfterTest}`);
    add();
    if (f.issues.length > 0) {
      add(`**Design concerns flagged during framing:**`);
      add();
      for (const i of f.issues) add(`- (${i.severity}) ${i.issue}: ${i.why}`);
      add();
    }
  }

  if (h) {
    add(`## Hypothesis`);
    add();
    add(`> ${h.primary}`);
    add();
    add(`- **Null hypothesis:** ${h.nullHypothesis}`);
    add(`- **Alternative hypothesis:** ${h.alternative}`);
    add(`- **Directional expectation:** ${h.directional}`);
    add(`- **Success criteria:** ${h.successCriteria}`);
    add(`- **Practical significance threshold:** ${h.practicalThreshold}`);
    add();
  }

  if (rec) {
    add(`## Recommended Test Type`);
    add();
    add(`**${rec.testName}**`);
    add();
    add(`### Why This Test Was Used`);
    add();
    add(rec.whyRecommendedLong);
    add();
    add(`**Assumptions:**`);
    for (const a of rec.assumptions) add(`- ${a}`);
    add();
    add(`**Limitations:**`);
    for (const l of rec.limitations) add(`- ${l}`);
    add();
  }

  if (d) {
    add(`## Experiment Design`);
    add();
    add(`| Element | Value |`);
    add(`| --- | --- |`);
    add(`| Experiment type | ${d.experimentType} |`);
    add(`| Statistical test | ${d.statisticalTest} |`);
    add(`| Control | ${d.control} |`);
    add(`| Treatment | ${d.treatment} |`);
    add(`| Variants | ${d.numVariants} |`);
    add(`| Randomization unit | ${d.randomizationUnit} |`);
    add(`| Randomization method | ${d.randomizationMethod} |`);
    add(`| Split | ${d.split} |`);
    add(`| Planned duration | ${d.durationWeeks} weeks |`);
    add();
    add(`## Audience and Randomization`);
    add();
    add(`- **Audience:** ${d.audience}`);
    add(`- **Inclusion:** ${d.inclusion}`);
    add(`- **Exclusion:** ${d.exclusion}`);
    add(`- **Stopping rules:** ${d.stoppingRules}`);
    add(`- **Decision rules:** ${d.decisionRules}`);
    add();
  }

  if (exp.metrics && exp.metrics.length > 0) {
    add(`## Metrics`);
    add();
    add(`| Metric | Role | Type | Definition |`);
    add(`| --- | --- | --- | --- |`);
    for (const m of exp.metrics) add(`| ${m.name} | ${m.role} | ${m.kind} | ${m.numerator}${m.denominator ? " / " + m.denominator : ""} |`);
    add();
  }

  if (p && pi) {
    add(`## Sample Size and Power`);
    add();
    add(`- **Baseline:** ${pi.metricKind === "binary" ? pct(pi.baselineRate) : fmtNum(pi.baselineRate)}`);
    add(`- **Minimum detectable effect (relative):** ${pct(pi.mdeRelative)}`);
    add(`- **Significance level (alpha):** ${pi.alpha}`);
    add(`- **Power:** ${pct(pi.power, 0)}`);
    add(`- **Required sample per group:** ${Number.isFinite(p.samplePerGroup) ? p.samplePerGroup.toLocaleString() : "n/a"}`);
    add(`- **Total required sample:** ${Number.isFinite(p.totalSample) ? p.totalSample.toLocaleString() : "n/a"}`);
    add(`- **Estimated duration:** ${Number.isFinite(p.estimatedWeeks) ? p.estimatedWeeks + " weeks" : "n/a"}`);
    if (p.warnings.length) {
      add();
      add(`**Power warnings:**`);
      for (const w of p.warnings) add(`- ${w}`);
    }
    add();
  }

  if (exp.validationIssues && exp.validationIssues.length > 0) {
    add(`## Data Quality Checks`);
    add();
    for (const i of exp.validationIssues) add(`- **[${i.severity}] ${i.title}** — ${i.detail} ${i.whyItMatters}`);
    add();
  }

  if (r) {
    add(`## Results`);
    add();
    if (r.metricKind === "binary") {
      add(`| Variant | Users | Conversions | Rate |`);
      add(`| --- | --- | --- | --- |`);
      for (const g of r.groups) add(`| ${g.variant} | ${g.n.toLocaleString()} | ${g.conversions?.toLocaleString()} | ${pct(g.rate, 2)} |`);
    } else {
      add(`| Variant | Users | Mean | Median | Std Dev |`);
      add(`| --- | --- | --- | --- | --- |`);
      for (const g of r.groups) add(`| ${g.variant} | ${g.n.toLocaleString()} | ${fmtNum(g.mean)} | ${fmtNum(g.median)} | ${fmtNum(g.stdDev)} |`);
    }
    add();
    add(`| Comparison | Lift (abs) | Lift (rel) | 95% CI | p-value | Significant |`);
    add(`| --- | --- | --- | --- | --- | --- |`);
    for (const c of r.comparisons) {
      const ci = r.metricKind === "binary" ? `[${pct(c.ciLow, 2)}, ${pct(c.ciHigh, 2)}]` : `[${fmtNum(c.ciLow)}, ${fmtNum(c.ciHigh)}]`;
      add(`| ${c.treatment} vs ${c.control} | ${r.metricKind === "binary" ? pct(c.absoluteLift, 2) : fmtNum(c.absoluteLift)} | ${pct(c.relativeLift)} | ${ci} | ${fmtP(c.pValueAdjusted ?? c.pValue).replace("= ", "")} | ${c.significant ? "Yes" : "No"} |`);
    }
    add();
    add(`**Method:** ${r.method}`);
    if (r.multipleComparisonNote) {
      add();
      add(`*${r.multipleComparisonNote}*`);
    }
    add();
    add(`**Sample ratio check:** chi-square ${r.srm.chiSquare.toFixed(2)}, p ${fmtP(r.srm.pValue)} — ${r.srm.mismatch ? "mismatch detected; results should not be trusted until investigated" : "no mismatch detected"}.`);
    add();
  }

  if (interp) {
    add(`## Statistical Interpretation`);
    add();
    add(interp.statisticalResult);
    add();
    add(`## Practical Significance`);
    add();
    add(interp.businessInterpretation);
    add();
  }

  if (exp.segments && exp.segments.length > 0) {
    add(`## Segment Analysis (Exploratory)`);
    add();
    add(`| Segment | n | Relative Lift | p-value | Significant |`);
    add(`| --- | --- | --- | --- | --- |`);
    for (const s of exp.segments) add(`| ${s.value} | ${s.n.toLocaleString()} | ${pct(s.lift)} | ${fmtP(s.pValue).replace("= ", "")} | ${s.significant ? "Yes" : "No"} |`);
    add();
    add(`*Segment cuts are exploratory. Testing many comparisons increases the chance of false positives — confirm any segment finding with a dedicated test.*`);
    add();
  }

  if (q) {
    add(`## Guardrail Review`);
    add();
    add(`Planned guardrails: ${q.guardrails.join(", ")}. ${exp.result ? "Guardrail metrics should be reviewed in their own analyses before shipping." : ""}`);
    add();
  }

  if (interp) {
    add(`## Risks and Caveats`);
    add();
    for (const c of interp.caveats) add(`- ${c}`);
    if (interp.caveats.length === 0) add(`- No additional caveats beyond standard experimental assumptions.`);
    add();
    add(`## Recommendation`);
    add();
    add(`**${interp.recommendation}**`);
    add();
    add(interp.recommendationDetail);
    add();
    add(`## Next Steps`);
    add();
    for (const s of interp.nextSteps) add(`- ${s}`);
    add();
  }

  add(`## Appendix`);
  add();
  add(`- Dataset: ${exp.datasetMeta ? `${exp.datasetMeta.fileName} (${exp.datasetMeta.rowCount.toLocaleString()} rows)` : "not uploaded"}`);
  add(`- Analysis engine: browser-based MVP (frequentist defaults: 95% confidence, two-sided tests)`);
  add(`- This report was generated by the AI-Guided Experimentation Platform.`);

  return lines.join("\n");
}

export function markdownToHtml(md: string): string {
  // Minimal converter sufficient for our own generated markdown.
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let tableBuf: string[] = [];

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.filter((r) => !/^\|[\s\-|]+\|$/.test(r));
    out.push("<table>");
    rows.forEach((row, idx) => {
      const cells = row.split("|").slice(1, -1).map((c) => c.trim());
      const tag = idx === 0 ? "th" : "td";
      out.push("<tr>" + cells.map((c) => `<${tag}>${inline(esc(c))}</${tag}>`).join("") + "</tr>");
    });
    out.push("</table>");
    tableBuf = [];
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (/^\|.*\|$/.test(line.trim())) {
      closeList();
      tableBuf.push(line.trim());
      continue;
    }
    flushTable();
    if (line.startsWith("### ")) { closeList(); out.push(`<h3>${inline(esc(line.slice(4)))}</h3>`); }
    else if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inline(esc(line.slice(3)))}</h2>`); }
    else if (line.startsWith("# ")) { closeList(); out.push(`<h1>${inline(esc(line.slice(2)))}</h1>`); }
    else if (line.startsWith("> ")) { closeList(); out.push(`<blockquote>${inline(esc(line.slice(2)))}</blockquote>`); }
    else if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(esc(line.slice(2)))}</li>`);
    } else if (line.trim() === "") closeList();
    else { closeList(); out.push(`<p>${inline(esc(line))}</p>`); }
  }
  flushTable();
  closeList();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Experiment Report</title><style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1a2233;line-height:1.6}
  h1{font-size:26px;border-bottom:2px solid #e5e9f0;padding-bottom:12px}
  h2{font-size:19px;margin-top:32px;color:#1e3a8a}
  h3{font-size:16px;margin-top:24px}
  blockquote{border-left:3px solid #3b82f6;margin:12px 0;padding:4px 16px;background:#f0f6ff;color:#334}
  table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
  th,td{border:1px solid #dde3ec;padding:8px 12px;text-align:left}
  th{background:#f4f7fb}
  code{background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:13px}
  @media print{body{margin:0}}
  </style></head><body>${out.join("\n")}</body></html>`;
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
