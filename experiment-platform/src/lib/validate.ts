import type { ParsedDataset, ValidationIssue } from "./types";
import { srmChiSquare } from "./stats";

const ID_COLUMNS = ["user_id", "unit_id", "account_id"];
const METRIC_COLUMNS = ["primary_metric", "conversion", "revenue", "count_metric", "metric", "converted", "outcome"];
const TIME_COLUMNS = ["timestamp", "experiment_date", "exposure_timestamp", "event_timestamp", "date"];

export function findColumn(columns: string[], candidates: string[]): string | undefined {
  const lower = columns.map((c) => c.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = lower.indexOf(cand);
    if (idx >= 0) return columns[idx];
  }
  return undefined;
}

export function detectColumns(ds: ParsedDataset) {
  return {
    idCol: findColumn(ds.columns, ID_COLUMNS),
    variantCol: findColumn(ds.columns, ["variant", "group", "arm", "bucket"]),
    metricCol: findColumn(ds.columns, METRIC_COLUMNS),
    timeCol: findColumn(ds.columns, TIME_COLUMNS),
    preCol: findColumn(ds.columns, ["pre_experiment_metric", "pre_metric", "pre_period_metric"]),
    segmentCol: findColumn(ds.columns, ["segment", "country", "device", "channel"]),
    guardrailCol: findColumn(ds.columns, ["guardrail_metric"]),
  };
}

export function validateDataset(ds: ParsedDataset, expectedSplit?: number[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { idCol, variantCol, metricCol, timeCol } = detectColumns(ds);

  const push = (i: Omit<ValidationIssue, "id">) => issues.push({ id: `v${issues.length}`, ...i });

  // Required columns
  if (!idCol)
    push({
      title: "Missing user/unit ID column",
      severity: "critical",
      affectedRows: ds.rowCount,
      detail: "No column named user_id, unit_id, or account_id was found.",
      whyItMatters: "Without a unit identifier, duplicates and cross-variant contamination cannot be checked, and per-user analysis is impossible.",
      suggestedFix: "Rename your identifier column to user_id (or unit_id) and re-upload.",
      blocksAnalysis: true,
    });
  if (!variantCol)
    push({
      title: "Missing variant column",
      severity: "critical",
      affectedRows: ds.rowCount,
      detail: "No column named variant (or group/arm/bucket) was found.",
      whyItMatters: "The analysis cannot compare groups without knowing which unit was in which variant.",
      suggestedFix: "Add a variant column with values like 'control' and 'treatment'.",
      blocksAnalysis: true,
    });
  if (!metricCol)
    push({
      title: "Missing outcome metric column",
      severity: "critical",
      affectedRows: ds.rowCount,
      detail: "No column named primary_metric, conversion, revenue, or similar was found.",
      whyItMatters: "There is no outcome to analyze.",
      suggestedFix: "Add a primary_metric column (0/1 for conversion, or a numeric value).",
      blocksAnalysis: true,
    });
  if (!timeCol)
    push({
      title: "No timestamp column",
      severity: "info",
      affectedRows: ds.rowCount,
      detail: "No timestamp or experiment_date column was found.",
      whyItMatters: "Timestamps allow checking for pre-test contamination and time-based anomalies. Analysis can proceed without them.",
      suggestedFix: "Include exposure_timestamp if available.",
      blocksAnalysis: false,
    });

  if (!idCol || !variantCol || !metricCol) return issues;

  // Variant hygiene
  const variantCounts = new Map<string, number>();
  const userVariants = new Map<string, Set<string>>();
  const userRows = new Map<string, number>();
  let missingValues = 0;
  let nonNumeric = 0;
  let negatives = 0;
  const numericValues: number[] = [];

  for (const row of ds.rows) {
    const v = (row[variantCol] ?? "").trim();
    const id = (row[idCol] ?? "").trim();
    const m = (row[metricCol] ?? "").trim();

    if (!v || !id || m === "") {
      missingValues++;
      continue;
    }
    variantCounts.set(v, (variantCounts.get(v) ?? 0) + 1);
    userRows.set(id, (userRows.get(id) ?? 0) + 1);
    if (!userVariants.has(id)) userVariants.set(id, new Set());
    userVariants.get(id)!.add(v);

    const num = Number(m);
    if (Number.isNaN(num)) nonNumeric++;
    else {
      numericValues.push(num);
      if (num < 0) negatives++;
    }
  }

  if (missingValues > 0)
    push({
      title: "Rows with missing values",
      severity: missingValues / ds.rowCount > 0.05 ? "warning" : "info",
      affectedRows: missingValues,
      detail: `${missingValues} rows are missing the ID, variant, or metric value and will be excluded.`,
      whyItMatters: "If missingness differs between variants, exclusions can bias the comparison.",
      suggestedFix: "Check the export pipeline; confirm missingness is balanced across variants.",
      blocksAnalysis: false,
    });

  if (nonNumeric > 0)
    push({
      title: "Non-numeric metric values",
      severity: nonNumeric / ds.rowCount > 0.05 ? "critical" : "warning",
      affectedRows: nonNumeric,
      detail: `${nonNumeric} rows have metric values that are not numbers (mixed data types).`,
      whyItMatters: "Mixed types usually indicate an export or join problem and corrupt the analysis.",
      suggestedFix: "Ensure the metric column contains only numbers (use 0/1 for conversion).",
      blocksAnalysis: nonNumeric / ds.rowCount > 0.05,
    });

  const dupUsers = [...userRows.values()].filter((c) => c > 1).length;
  if (dupUsers > 0)
    push({
      title: "Duplicate units",
      severity: dupUsers / userRows.size > 0.02 ? "warning" : "info",
      affectedRows: dupUsers,
      detail: `${dupUsers} unit IDs appear more than once. The analysis uses one row per unit (first occurrence).`,
      whyItMatters: "Duplicates inflate sample size and violate independence assumptions.",
      suggestedFix: "Deduplicate to one row per unit before export, aggregating the metric per unit.",
      blocksAnalysis: false,
    });

  const contaminated = [...userVariants.values()].filter((s) => s.size > 1).length;
  if (contaminated > 0)
    push({
      title: "Units in multiple variants",
      severity: "critical",
      affectedRows: contaminated,
      detail: `${contaminated} units appear in more than one variant.`,
      whyItMatters: "Cross-variant contamination breaks randomization — these users experienced both variants, so neither group is clean.",
      suggestedFix: "Investigate the assignment system. Exclude contaminated units or fix assignment and rerun.",
      blocksAnalysis: contaminated / userVariants.size > 0.05,
    });

  const variants = [...variantCounts.keys()];
  if (variants.length < 2)
    push({
      title: "Fewer than two variants",
      severity: "critical",
      affectedRows: ds.rowCount,
      detail: `Only ${variants.length} variant value(s) found: ${variants.join(", ")}.`,
      whyItMatters: "A comparison requires at least a control and one treatment.",
      suggestedFix: "Check the variant column values.",
      blocksAnalysis: true,
    });
  if (variants.length > 6)
    push({
      title: "Unusually many variant values",
      severity: "warning",
      affectedRows: ds.rowCount,
      detail: `${variants.length} distinct variant values found — possible typos or inconsistent labels (${variants.slice(0, 8).join(", ")}…).`,
      whyItMatters: "Typos split groups and distort every downstream statistic.",
      suggestedFix: "Normalize variant labels to a small fixed set.",
      blocksAnalysis: false,
    });

  // SRM
  if (variants.length >= 2 && variants.length <= 6) {
    const counts = variants.map((v) => variantCounts.get(v)!);
    const shares = expectedSplit && expectedSplit.length === variants.length ? expectedSplit : variants.map(() => 1 / variants.length);
    const { chi2, pValue } = srmChiSquare(counts, shares);
    if (pValue < 0.001) {
      push({
        title: "Sample ratio mismatch detected",
        severity: "critical",
        affectedRows: ds.rowCount,
        detail: `Observed split ${counts.join(" / ")} deviates from the expected split (chi-square ${chi2.toFixed(1)}, p = ${pValue.toExponential(2)}).`,
        whyItMatters: "Sample ratio mismatch may indicate assignment, logging, or data pipeline issues. Do not trust the result until this is investigated.",
        suggestedFix: "Audit assignment logs, bot filtering, and event loss before interpreting any results.",
        blocksAnalysis: false,
      });
    } else if (pValue < 0.01) {
      push({
        title: "Possible sample ratio mismatch",
        severity: "warning",
        affectedRows: ds.rowCount,
        detail: `Observed split ${counts.join(" / ")} is mildly suspicious (p = ${pValue.toFixed(4)}).`,
        whyItMatters: "Borderline SRM can still signal pipeline problems.",
        suggestedFix: "Double-check assignment logging; proceed with caution.",
        blocksAnalysis: false,
      });
    }
  }

  // Value plausibility
  if (numericValues.length > 0) {
    const distinct = new Set(numericValues);
    const isBinary = [...distinct].every((v) => v === 0 || v === 1);
    if (!isBinary) {
      if (negatives > 0)
        push({
          title: "Negative metric values",
          severity: "warning",
          affectedRows: negatives,
          detail: `${negatives} rows have negative values.`,
          whyItMatters: "Negative revenue or counts are often refunds or logging errors and can flip conclusions.",
          suggestedFix: "Confirm negatives are intentional (e.g., net revenue with refunds); otherwise clean them.",
          blocksAnalysis: false,
        });
      const sorted = [...numericValues].sort((a, b) => a - b);
      const p99 = sorted[Math.floor(0.99 * (sorted.length - 1))];
      const med = sorted[Math.floor(sorted.length / 2)];
      if (med > 0 && p99 > med * 50)
        push({
          title: "Extreme outliers detected",
          severity: "warning",
          affectedRows: numericValues.filter((v) => v > p99).length,
          detail: `The 99th percentile (${p99.toLocaleString()}) is more than 50× the median (${med.toLocaleString()}).`,
          whyItMatters: "A handful of extreme values can dominate means and produce misleading lifts.",
          suggestedFix: "Review outliers for validity; consider a bootstrap CI (applied automatically for revenue) or winsorization.",
          blocksAnalysis: false,
        });
    }
  }

  // Timestamp sanity
  if (timeCol) {
    let badTs = 0;
    for (const row of ds.rows) {
      const t = (row[timeCol] ?? "").trim();
      if (t && Number.isNaN(Date.parse(t))) badTs++;
    }
    if (badTs > 0)
      push({
        title: "Unparseable timestamps",
        severity: "info",
        affectedRows: badTs,
        detail: `${badTs} rows have timestamps that could not be parsed.`,
        whyItMatters: "Prevents time-based checks such as pre-test contamination.",
        suggestedFix: "Use ISO 8601 dates (YYYY-MM-DD).",
        blocksAnalysis: false,
      });
  }

  if (issues.length === 0)
    push({
      title: "No data quality issues detected",
      severity: "info",
      affectedRows: 0,
      detail: "Required columns present, variants clean, no SRM, no contamination detected.",
      whyItMatters: "The dataset is ready for analysis.",
      suggestedFix: "Proceed to analysis.",
      blocksAnalysis: false,
    });

  return issues;
}
