import type {
  GroupStats,
  MetricKind,
  ParsedDataset,
  ResultClassification,
  SegmentResult,
  SrmResult,
  StatisticalResult,
  VariantComparison,
} from "./types";
import {
  benjaminiHochberg,
  bootstrapMeanDiffCi,
  mean,
  median,
  srmChiSquare,
  stdDev,
  twoProportionZTest,
  welchTTest,
} from "./stats";
import { detectColumns } from "./validate";

interface UnitRecord {
  variant: string;
  value: number;
  segment?: string;
}

const CONTROL_NAMES = ["control", "a", "baseline", "holdout", "current", "0"];

export function pickControl(variants: string[]): string {
  for (const name of CONTROL_NAMES) {
    const found = variants.find((v) => v.toLowerCase() === name);
    if (found) return found;
  }
  return [...variants].sort()[0];
}

/** Collapse rows to one record per unit (first occurrence, skipping contaminated units). */
export function toUnitRecords(ds: ParsedDataset): { records: UnitRecord[]; metricColUsed: string | null } {
  const { idCol, variantCol, metricCol, segmentCol } = detectColumns(ds);
  if (!idCol || !variantCol || !metricCol) return { records: [], metricColUsed: null };

  const seen = new Map<string, UnitRecord>();
  const contaminated = new Set<string>();
  for (const row of ds.rows) {
    const id = (row[idCol] ?? "").trim();
    const variant = (row[variantCol] ?? "").trim();
    const raw = (row[metricCol] ?? "").trim();
    if (!id || !variant || raw === "") continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    const existing = seen.get(id);
    if (existing) {
      if (existing.variant !== variant) contaminated.add(id);
      continue;
    }
    seen.set(id, { variant, value, segment: segmentCol ? (row[segmentCol] ?? "").trim() || undefined : undefined });
  }
  for (const id of contaminated) seen.delete(id);
  return { records: [...seen.values()], metricColUsed: metricCol };
}

export function detectMetricKind(values: number[], metricColName: string | null): MetricKind {
  const name = (metricColName ?? "").toLowerCase();
  if (name.includes("revenue")) return "revenue";
  const distinct = new Set(values);
  if ([...distinct].every((v) => v === 0 || v === 1)) return "binary";
  if (name.includes("count") && values.every((v) => Number.isInteger(v) && v >= 0)) return "count";
  // Heuristic: non-negative, skewed → treat like revenue-ish continuous
  return "continuous";
}

export function analyzeDataset(
  ds: ParsedDataset,
  opts: { alpha?: number; practicalThresholdRel?: number; plannedSamplePerGroup?: number; expectedSplit?: number[] } = {}
): { result: StatisticalResult; segments: SegmentResult[] } | { error: string } {
  const alpha = opts.alpha ?? 0.05;
  const practical = opts.practicalThresholdRel ?? 0.02;
  const { records, metricColUsed } = toUnitRecords(ds);
  if (records.length === 0) return { error: "No usable rows. Check required columns (user_id, variant, primary_metric)." };

  const byVariant = new Map<string, number[]>();
  for (const r of records) {
    if (!byVariant.has(r.variant)) byVariant.set(r.variant, []);
    byVariant.get(r.variant)!.push(r.value);
  }
  const variants = [...byVariant.keys()];
  if (variants.length < 2) return { error: "Need at least two variants to compare." };

  const control = pickControl(variants);
  const treatments = variants.filter((v) => v !== control);
  const kind = detectMetricKind(records.map((r) => r.value), metricColUsed);

  // SRM
  const counts = variants.map((v) => byVariant.get(v)!.length);
  const shares = opts.expectedSplit && opts.expectedSplit.length === variants.length ? opts.expectedSplit : variants.map(() => 1 / variants.length);
  const srmRaw = srmChiSquare(counts, shares);
  const srm: SrmResult = {
    variants,
    actualCounts: counts,
    expectedSplit: shares,
    chiSquare: srmRaw.chi2,
    pValue: srmRaw.pValue,
    mismatch: srmRaw.pValue < 0.001,
  };

  // Group stats
  const groups: GroupStats[] = variants.map((v) => {
    const vals = byVariant.get(v)!;
    const g: GroupStats = { variant: v, n: vals.length };
    if (kind === "binary") {
      g.conversions = vals.filter((x) => x === 1).length;
      g.rate = g.conversions / vals.length;
    } else {
      g.mean = mean(vals);
      g.median = median(vals);
      g.stdDev = stdDev(vals);
      g.total = vals.reduce((s, x) => s + x, 0);
    }
    return g;
  });

  // Comparisons
  const comparisons: VariantComparison[] = [];
  const controlVals = byVariant.get(control)!;
  for (const t of treatments) {
    const tVals = byVariant.get(t)!;
    if (kind === "binary") {
      const cConv = controlVals.filter((x) => x === 1).length;
      const tConv = tVals.filter((x) => x === 1).length;
      const r = twoProportionZTest(cConv, controlVals.length, tConv, tVals.length, alpha);
      comparisons.push({
        control,
        treatment: t,
        absoluteLift: r.absoluteLift,
        relativeLift: r.relativeLift,
        standardError: r.standardError,
        ciLow: r.ciLow,
        ciHigh: r.ciHigh,
        statistic: r.z,
        pValue: r.pValue,
        significant: r.pValue < alpha,
      });
    } else {
      const r = welchTTest(controlVals, tVals, alpha);
      const cMean = mean(controlVals);
      const comp: VariantComparison = {
        control,
        treatment: t,
        absoluteLift: r.meanDiff,
        relativeLift: cMean === 0 ? NaN : r.meanDiff / cMean,
        standardError: r.standardError,
        ciLow: r.ciLow,
        ciHigh: r.ciHigh,
        statistic: r.t,
        pValue: r.pValue,
        significant: r.pValue < alpha,
        effectSize: r.cohensD,
      };
      if (kind === "revenue" || isHeavyTailed(tVals) || isHeavyTailed(controlVals)) {
        comp.bootstrapCi = bootstrapMeanDiffCi(controlVals, tVals, alpha);
      }
      comparisons.push(comp);
    }
  }

  // Multiple comparisons correction for A/B/n
  let multipleComparisonNote: string | undefined;
  if (comparisons.length > 1) {
    const adjusted = benjaminiHochberg(comparisons.map((c) => c.pValue));
    comparisons.forEach((c, i) => {
      c.pValueAdjusted = adjusted[i];
      c.significant = adjusted[i] < alpha;
    });
    multipleComparisonNote = `Because ${comparisons.length} treatments are compared against control, p-values were adjusted with the Benjamini-Hochberg procedure to control the false discovery rate. Significance decisions use the adjusted values.`;
  }

  // Classification (based on the best treatment vs control)
  const best = [...comparisons].sort((a, b) => b.relativeLift - a.relativeLift)[0];
  const classification = classify(best, srm, alpha, practical, opts.plannedSamplePerGroup, groups);

  // Segments
  const segments = analyzeSegments(records, control, kind, alpha);

  return {
    result: {
      metricKind: kind,
      method:
        kind === "binary"
          ? "Two-proportion z-test" + (comparisons.length > 1 ? " with Benjamini-Hochberg correction" : "")
          : "Welch's t-test" + (comparisons.some((c) => c.bootstrapCi) ? " with bootstrap CI check" : ""),
      groups,
      comparisons,
      srm,
      classification,
      multipleComparisonNote,
    },
    segments,
  };
}

function isHeavyTailed(vals: number[]): boolean {
  if (vals.length < 20) return false;
  const s = [...vals].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)];
  const p99 = s[Math.floor(0.99 * (s.length - 1))];
  return med > 0 && p99 > med * 20;
}

function classify(
  best: VariantComparison,
  srm: SrmResult,
  alpha: number,
  practicalRel: number,
  plannedPerGroup: number | undefined,
  groups: GroupStats[]
): ResultClassification {
  if (srm.mismatch) return "data-quality-issue";
  const minN = Math.min(...groups.map((g) => g.n));
  const underpowered = plannedPerGroup ? minN < plannedPerGroup * 0.8 : minN < 200;

  const sig = best.significant;
  const meaningful = Math.abs(best.relativeLift) >= practicalRel;
  const negative = best.relativeLift < 0;

  if (sig && negative) return "harmful";
  if (sig && meaningful) return "significant-meaningful";
  if (sig && !meaningful) return "significant-not-meaningful";
  if (!sig && meaningful && underpowered) return "underpowered";
  if (!sig && meaningful) return "meaningful-not-significant";
  if (underpowered) return "needs-more-data";
  return "inconclusive";
}

function analyzeSegments(records: UnitRecord[], control: string, kind: MetricKind, alpha: number): SegmentResult[] {
  const withSeg = records.filter((r) => r.segment);
  if (withSeg.length < records.length * 0.5) return [];
  const segValues = [...new Set(withSeg.map((r) => r.segment!))];
  if (segValues.length < 2 || segValues.length > 12) return [];

  const results: SegmentResult[] = [];
  for (const seg of segValues) {
    const segRecords = withSeg.filter((r) => r.segment === seg);
    const cVals = segRecords.filter((r) => r.variant === control).map((r) => r.value);
    const tVals = segRecords.filter((r) => r.variant !== control).map((r) => r.value);
    if (cVals.length < 30 || tVals.length < 30) continue;
    if (kind === "binary") {
      const r = twoProportionZTest(cVals.filter((x) => x === 1).length, cVals.length, tVals.filter((x) => x === 1).length, tVals.length, alpha);
      results.push({ segment: "segment", value: seg, n: segRecords.length, lift: r.relativeLift, pValue: r.pValue, significant: r.pValue < alpha });
    } else {
      const r = welchTTest(cVals, tVals, alpha);
      const cMean = mean(cVals);
      results.push({ segment: "segment", value: seg, n: segRecords.length, lift: cMean === 0 ? NaN : r.meanDiff / cMean, pValue: r.pValue, significant: r.pValue < alpha });
    }
  }
  return results;
}
