"use client";

// Direct CSV analysis without the full planning workflow.

import { useMemo, useState } from "react";
import { Banner, Button, Card, SectionTitle } from "@/components/ui";
import CsvUploader from "@/components/CsvUploader";
import { InterpretationPanel, ResultsPanel, SegmentsPanel, ValidationPanel } from "@/components/AnalysisResults";
import { validateDataset } from "@/lib/validate";
import { analyzeDataset } from "@/lib/analyze";
import { interpretResult } from "@/lib/interpret";
import { getSettings, saveReport } from "@/lib/storage";
import { download, markdownToHtml } from "@/lib/report";
import type { Interpretation, ParsedDataset, SegmentResult, StatisticalResult, ValidationIssue } from "@/lib/types";
import { fmtP } from "@/lib/interpret";

export default function AnalyzePage() {
  const settings = useMemo(() => getSettings(), []);
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [result, setResult] = useState<StatisticalResult | null>(null);
  const [segments, setSegments] = useState<SegmentResult[]>([]);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const onParsed = (ds: ParsedDataset) => {
    setDataset(ds);
    setResult(null);
    setInterpretation(null);
    setError(null);
    setSavedMsg(false);
    setIssues(validateDataset(ds));
  };

  const run = () => {
    if (!dataset) return;
    const out = analyzeDataset(dataset, { alpha: 1 - settings.confidenceLevel });
    if ("error" in out) {
      setError(out.error);
      return;
    }
    setResult(out.result);
    setSegments(out.segments);
    setInterpretation(interpretResult(out.result, { validationIssues: issues ?? [], segments: out.segments, confidenceLevel: settings.confidenceLevel }));
  };

  const quickReportMd = () => {
    if (!dataset || !result || !interpretation) return "";
    const lines = [
      `# Quick Analysis Report: ${dataset.fileName}`,
      "",
      `*Generated ${new Date().toISOString().slice(0, 10)} · ${result.method}*`,
      "",
      `## Summary`,
      "",
      interpretation.headline,
      "",
      `**Recommendation: ${interpretation.recommendation}.** ${interpretation.recommendationDetail}`,
      "",
      `## Statistical Result`,
      "",
      interpretation.statisticalResult,
      "",
      `## Business Interpretation`,
      "",
      interpretation.businessInterpretation,
      "",
      `## Caveats`,
      "",
      ...interpretation.caveats.map((c) => `- ${c}`),
      "",
      `## Data Quality`,
      "",
      ...(issues ?? []).map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`),
      "",
      `## Sample Ratio Check`,
      "",
      `Chi-square ${result.srm.chiSquare.toFixed(2)}, p ${fmtP(result.srm.pValue)} — ${result.srm.mismatch ? "mismatch detected" : "no mismatch"}.`,
    ];
    return lines.join("\n");
  };

  const saveToReports = () => {
    const md = quickReportMd();
    if (!md) return;
    saveReport({
      id: `rep_${Date.now().toString(36)}`,
      experimentId: "adhoc",
      title: `Quick analysis: ${dataset?.fileName}`,
      createdAt: new Date().toISOString(),
      markdown: md,
    });
    setSavedMsg(true);
  };

  const blocking = (issues ?? []).filter((i) => i.blocksAnalysis);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analyze Results</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload experiment data directly for validation, statistical analysis, and interpretation — without the full planning workflow.
        </p>
      </div>

      <Card>
        <SectionTitle sub="The platform auto-detects the metric type (binary, continuous, revenue) and picks the appropriate test.">Upload CSV</SectionTitle>
        <CsvUploader onParsed={onParsed} />
      </Card>

      {dataset && issues && (
        <>
          <SectionTitle sub={`${dataset.fileName} · ${dataset.rowCount.toLocaleString()} rows · columns: ${dataset.columns.join(", ")}`}>Data validation</SectionTitle>
          <ValidationPanel issues={issues} />
          {blocking.length > 0 ? (
            <Banner tone="critical" title="Analysis blocked">Fix the critical issues and re-upload.</Banner>
          ) : (
            !result && (
              <div className="flex justify-end">
                <Button onClick={run}>Run Analysis</Button>
              </div>
            )
          )}
        </>
      )}

      {error && <Banner tone="critical" title="Analysis error">{error}</Banner>}

      {result && (
        <>
          <SectionTitle>Results</SectionTitle>
          <ResultsPanel result={result} confidenceLevel={settings.confidenceLevel} />
          <SegmentsPanel segments={segments} />
          {interpretation && (
            <>
              <SectionTitle>Interpretation</SectionTitle>
              <InterpretationPanel interpretation={interpretation} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => download("quick-analysis.md", quickReportMd(), "text/markdown")}>Download Markdown</Button>
                <Button variant="secondary" onClick={() => download("quick-analysis.html", markdownToHtml(quickReportMd()), "text/html")}>Download HTML</Button>
                <Button variant="secondary" onClick={saveToReports}>Save to Reports</Button>
              </div>
              {savedMsg && <Banner tone="success">Saved. Find it under Reports.</Banner>}
            </>
          )}
        </>
      )}
    </div>
  );
}
