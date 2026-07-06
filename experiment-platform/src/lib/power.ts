import { normalInv } from "./stats";
import type { PowerInputs, PowerResult } from "./types";

/** Sample size per group for a two-proportion test (equal-variance approximation). */
export function sampleSizeBinary(
  baseline: number,
  mdeRelative: number,
  alpha: number,
  power: number,
  twoSided: boolean
): number {
  const p1 = baseline;
  const p2 = baseline * (1 + mdeRelative);
  if (p2 <= 0 || p2 >= 1 || p1 <= 0 || p1 >= 1) return NaN;
  const zAlpha = normalInv(1 - (twoSided ? alpha / 2 : alpha));
  const zBeta = normalInv(power);
  const pBar = (p1 + p2) / 2;
  const num =
    (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  return Math.ceil(num / (p2 - p1) ** 2);
}

/** Sample size per group for a two-mean comparison. */
export function sampleSizeContinuous(
  baselineMean: number,
  sd: number,
  mdeRelative: number,
  alpha: number,
  power: number,
  twoSided: boolean
): number {
  const delta = Math.abs(baselineMean * mdeRelative);
  if (delta === 0 || sd <= 0) return NaN;
  const zAlpha = normalInv(1 - (twoSided ? alpha / 2 : alpha));
  const zBeta = normalInv(power);
  return Math.ceil((2 * (zAlpha + zBeta) ** 2 * sd * sd) / (delta * delta));
}

export function runPowerAnalysis(inputs: PowerInputs): PowerResult {
  const warnings: string[] = [];
  let perGroup: number;
  const absoluteMde =
    inputs.metricKind === "binary"
      ? inputs.baselineRate * inputs.mdeRelative
      : inputs.baselineRate * inputs.mdeRelative;

  if (inputs.metricKind === "binary") {
    perGroup = sampleSizeBinary(inputs.baselineRate, inputs.mdeRelative, inputs.alpha, inputs.power, inputs.twoSided);
  } else {
    perGroup = sampleSizeContinuous(
      inputs.baselineRate,
      inputs.stdDev,
      inputs.mdeRelative,
      inputs.alpha,
      inputs.power,
      inputs.twoSided
    );
  }

  if (!Number.isFinite(perGroup)) {
    return {
      samplePerGroup: NaN,
      totalSample: NaN,
      estimatedWeeks: NaN,
      feasible: false,
      absoluteMde,
      warnings: ["Inputs produce an invalid calculation. Check that the baseline and MDE are plausible."],
    };
  }

  // Unequal allocation inflates the required total sample.
  const q = inputs.allocation; // treatment share
  const allocationPenalty = 1 / (4 * q * (1 - q)); // 1.0 at 50/50
  const total = Math.ceil(perGroup * 2 * allocationPenalty);
  const weeks = inputs.weeklyTraffic > 0 ? total / inputs.weeklyTraffic : Infinity;

  if (weeks > 8) warnings.push("The required duration may be too long. Consider a larger audience or a bigger minimum detectable effect.");
  if (weeks > 26) warnings.push("This test is likely infeasible at current traffic. This test may need a larger audience or a more sensitive metric.");
  if (inputs.mdeRelative < 0.02) warnings.push("The expected lift is smaller than most platforms can reliably detect without very large samples.");
  if (inputs.weeklyTraffic > 0 && inputs.weeklyTraffic * 2 < total && weeks > 4)
    warnings.push("This test is likely underpowered at typical durations (under 4 weeks of traffic).");
  if (q !== 0.5) warnings.push("Unequal splits require a larger total sample than a 50/50 split for the same power.");

  return {
    samplePerGroup: perGroup,
    totalSample: total,
    estimatedWeeks: Number.isFinite(weeks) ? Math.ceil(weeks * 10) / 10 : NaN,
    feasible: Number.isFinite(weeks) ? weeks <= 12 : false,
    absoluteMde,
    warnings,
  };
}
