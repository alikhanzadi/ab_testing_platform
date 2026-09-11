// Statistical primitives: distributions, tests, and resampling.

/** Standard normal CDF via Abramowitz & Stegun approximation. */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Inverse standard normal CDF (Acklam's algorithm). */
export function normalInv(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("p must be in (0,1)");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Student-t CDF via incomplete beta (good enough for reporting p-values). */
export function tCdf(t: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  const p = 0.5 * incompleteBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - p : p;
}

function logGamma(x: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const front = Math.exp(lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaCf(x, a, b)) / a;
  }
  return 1 - (front * betaCf(1 - x, b, a)) / b;
}

function betaCf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Chi-square upper-tail p-value (df >= 1). */
export function chiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - lowerGamma(df / 2, chi2 / 2);
}

/** Regularized lower incomplete gamma P(a, x). */
function lowerGamma(a: number, x: number): number {
  if (x < a + 1) {
    // series
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for Q, return 1-Q
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

export function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

export function stdDev(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

export interface TwoProportionResult {
  z: number;
  pValue: number;
  absoluteLift: number;
  relativeLift: number;
  standardError: number;
  ciLow: number;
  ciHigh: number;
}

/** Two-proportion z-test (pooled SE for the test, unpooled for the CI). */
export function twoProportionZTest(
  convA: number,
  nA: number,
  convB: number,
  nB: number,
  alpha = 0.05,
  twoSided = true
): TwoProportionResult {
  const pA = convA / nA;
  const pB = convB / nB;
  const pooled = (convA + convB) / (nA + nB);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  const z = sePooled === 0 ? 0 : (pB - pA) / sePooled;
  const pValue = twoSided ? 2 * (1 - normalCdf(Math.abs(z))) : 1 - normalCdf(z);
  const seUnpooled = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const zCrit = normalInv(1 - alpha / 2);
  return {
    z,
    pValue: Math.min(1, Math.max(0, pValue)),
    absoluteLift: pB - pA,
    relativeLift: pA === 0 ? NaN : (pB - pA) / pA,
    standardError: seUnpooled,
    ciLow: pB - pA - zCrit * seUnpooled,
    ciHigh: pB - pA + zCrit * seUnpooled,
  };
}

export interface WelchResult {
  t: number;
  df: number;
  pValue: number;
  meanDiff: number;
  standardError: number;
  ciLow: number;
  ciHigh: number;
  cohensD: number;
}

/** Welch's t-test for two independent samples. */
export function welchTTest(a: number[], b: number[], alpha = 0.05): WelchResult {
  const mA = mean(a);
  const mB = mean(b);
  const vA = variance(a);
  const vB = variance(b);
  const nA = a.length;
  const nB = b.length;
  const se = Math.sqrt(vA / nA + vB / nB);
  const t = se === 0 ? 0 : (mB - mA) / se;
  const dfNum = (vA / nA + vB / nB) ** 2;
  const dfDen = (vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1);
  const df = dfDen === 0 ? nA + nB - 2 : dfNum / dfDen;
  const pValue = 2 * (1 - tCdf(Math.abs(t), df));
  const pooledSd = Math.sqrt(((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2));
  // Use normal critical value for CI; fine at experiment-scale samples.
  const crit = normalInv(1 - alpha / 2);
  return {
    t,
    df,
    pValue: Math.min(1, Math.max(0, pValue)),
    meanDiff: mB - mA,
    standardError: se,
    ciLow: mB - mA - crit * se,
    ciHigh: mB - mA + crit * se,
    cohensD: pooledSd === 0 ? 0 : (mB - mA) / pooledSd,
  };
}

/** Chi-square goodness-of-fit for sample ratio mismatch. */
export function srmChiSquare(counts: number[], expectedShares: number[]): { chi2: number; pValue: number } {
  const total = counts.reduce((s, c) => s + c, 0);
  let chi2 = 0;
  for (let i = 0; i < counts.length; i++) {
    const expected = total * expectedShares[i];
    if (expected > 0) chi2 += (counts[i] - expected) ** 2 / expected;
  }
  return { chi2, pValue: chiSquarePValue(chi2, counts.length - 1) };
}

/** Bootstrap percentile CI for difference in means (treatment - control). */
export function bootstrapMeanDiffCi(
  control: number[],
  treatment: number[],
  alpha = 0.05,
  iterations = 2000
): [number, number] {
  const diffs: number[] = [];
  const rand = mulberry32(42);
  for (let i = 0; i < iterations; i++) {
    let sC = 0;
    for (let j = 0; j < control.length; j++) sC += control[Math.floor(rand() * control.length)];
    let sT = 0;
    for (let j = 0; j < treatment.length; j++) sT += treatment[Math.floor(rand() * treatment.length)];
    diffs.push(sT / treatment.length - sC / control.length);
  }
  diffs.sort((a, b) => a - b);
  const lo = diffs[Math.floor((alpha / 2) * iterations)];
  const hi = diffs[Math.floor((1 - alpha / 2) * iterations)];
  return [lo, hi];
}

/** Deterministic PRNG so results are reproducible across runs. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bonferroni adjustment. */
export function bonferroni(pValues: number[]): number[] {
  const m = pValues.length;
  return pValues.map((p) => Math.min(1, p * m));
}

/** Benjamini-Hochberg adjusted p-values. */
export function benjaminiHochberg(pValues: number[]): number[] {
  const m = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array<number>(m);
  let prev = 1;
  for (let k = m - 1; k >= 0; k--) {
    const val = Math.min(prev, (indexed[k].p * m) / (k + 1));
    adjusted[indexed[k].i] = Math.min(1, val);
    prev = val;
  }
  return adjusted;
}

/** Bayesian A/B for binary outcomes with Beta(1,1) priors — Monte Carlo. */
export function bayesianBinary(
  convA: number,
  nA: number,
  convB: number,
  nB: number,
  iterations = 4000
): { probTreatmentBetter: number; expectedLift: number; credibleLow: number; credibleHigh: number } {
  const rand = mulberry32(7);
  const lifts: number[] = [];
  let better = 0;
  for (let i = 0; i < iterations; i++) {
    const a = betaSample(1 + convA, 1 + nA - convA, rand);
    const b = betaSample(1 + convB, 1 + nB - convB, rand);
    if (b > a) better++;
    lifts.push(a === 0 ? 0 : (b - a) / a);
  }
  lifts.sort((x, y) => x - y);
  return {
    probTreatmentBetter: better / iterations,
    expectedLift: mean(lifts),
    credibleLow: lifts[Math.floor(0.025 * iterations)],
    credibleHigh: lifts[Math.floor(0.975 * iterations)],
  };
}

function betaSample(a: number, b: number, rand: () => number): number {
  const x = gammaSample(a, rand);
  const y = gammaSample(b, rand);
  return x / (x + y);
}

function gammaSample(shape: number, rand: () => number): number {
  // Marsaglia-Tsang
  if (shape < 1) {
    const u = rand();
    return gammaSample(shape + 1, rand) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = normalSample(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(rand: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
