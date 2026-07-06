// CSV templates and deterministic demo data generators.

export interface CsvTemplate {
  id: string;
  name: string;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
  analysisMethods: string[];
  exampleRows: string[][];
  header: string[];
  generate: () => string; // full demo CSV
}

function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateFor(i: number): string {
  const d = new Date(2026, 5, 1 + (i % 21));
  return d.toISOString().slice(0, 10);
}

function binaryCsv(seed: number, n: number, pControl: number, pTreatment: number, extraCols?: { name: string; values: string[] }): string {
  const rand = prng(seed);
  const rows: string[] = [];
  const header = ["user_id", "variant", "conversion", "exposure_timestamp"];
  if (extraCols) header.push(extraCols.name);
  rows.push(header.join(","));
  for (let i = 0; i < n; i++) {
    const variant = i % 2 === 0 ? "control" : "treatment";
    const p = variant === "control" ? pControl : pTreatment;
    const conv = rand() < p ? 1 : 0;
    const row = [`u_${String(i + 1).padStart(5, "0")}`, variant, String(conv), dateFor(i)];
    if (extraCols) row.push(extraCols.values[Math.floor(rand() * extraCols.values.length)]);
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

function revenueCsv(seed: number, n: number, pBuyControl: number, pBuyTreatment: number, meanControl: number, meanTreatment: number): string {
  const rand = prng(seed);
  const rows: string[] = ["user_id,variant,revenue,exposure_timestamp"];
  for (let i = 0; i < n; i++) {
    const variant = i % 2 === 0 ? "control" : "treatment";
    const pBuy = variant === "control" ? pBuyControl : pBuyTreatment;
    const meanSpend = variant === "control" ? meanControl : meanTreatment;
    let rev = 0;
    if (rand() < pBuy) {
      // lognormal-ish spend
      const z = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-9))) * Math.cos(2 * Math.PI * rand());
      rev = Math.max(0.99, Math.round(Math.exp(Math.log(meanSpend) + 0.7 * z) * 100) / 100);
    }
    rows.push([`u_${String(i + 1).padStart(5, "0")}`, variant, rev.toFixed(2), dateFor(i)].join(","));
  }
  return rows.join("\n");
}

export const CSV_TEMPLATES: CsvTemplate[] = [
  {
    id: "landing-page",
    name: "Landing Page Conversion Test",
    description: "Simple binary conversion A/B test: one row per visitor, conversion 0/1. The demo data contains a real ~11% relative lift.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["exposure_timestamp", "device", "channel"],
    analysisMethods: ["Two-proportion z-test", "Bayesian A/B", "SRM check"],
    header: ["user_id", "variant", "conversion", "exposure_timestamp"],
    exampleRows: [
      ["u_00001", "control", "0", "2026-06-01"],
      ["u_00002", "treatment", "1", "2026-06-01"],
    ],
    generate: () => binaryCsv(7, 24000, 0.082, 0.091),
  },
  {
    id: "email-subject",
    name: "Email Subject Line Test (A/B/n)",
    description: "Three subject line variants against control, binary click outcome. Demonstrates multiple-comparison correction.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["send_timestamp", "campaign"],
    analysisMethods: ["Two-proportion z-tests + Benjamini-Hochberg", "SRM check"],
    header: ["user_id", "variant", "conversion", "exposure_timestamp"],
    exampleRows: [
      ["u_00001", "control", "0", "2026-06-01"],
      ["u_00002", "variant_b", "1", "2026-06-01"],
    ],
    generate: () => {
      const rand = prng(202);
      const variants = ["control", "variant_b", "variant_c", "variant_d"];
      const ps = [0.041, 0.044, 0.052, 0.039];
      const rows = ["user_id,variant,conversion,exposure_timestamp"];
      for (let i = 0; i < 16000; i++) {
        const vi = i % 4;
        rows.push([`u_${String(i + 1).padStart(5, "0")}`, variants[vi], rand() < ps[vi] ? "1" : "0", dateFor(i)].join(","));
      }
      return rows.join("\n");
    },
  },
  {
    id: "onboarding-flow",
    name: "Onboarding Flow Test",
    description: "Activation-rate test for a new onboarding flow. Includes a device segment column for exploratory segment analysis.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["segment", "signup_date"],
    analysisMethods: ["Two-proportion z-test", "Segment analysis (exploratory)", "SRM check"],
    header: ["user_id", "variant", "conversion", "exposure_timestamp", "segment"],
    exampleRows: [
      ["u_00001", "control", "0", "2026-06-01", "ios"],
      ["u_00002", "treatment", "1", "2026-06-01", "android"],
    ],
    generate: () => binaryCsv(303, 9000, 0.31, 0.345, { name: "segment", values: ["ios", "android", "web"] }),
  },
  {
    id: "pricing-page",
    name: "Pricing Page Test",
    description: "Trial-start conversion test for a redesigned pricing page. Demo data contains a small, non-significant difference — useful for practicing honest 'inconclusive' interpretation.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["exposure_timestamp", "channel"],
    analysisMethods: ["Two-proportion z-test", "SRM check"],
    header: ["user_id", "variant", "conversion", "exposure_timestamp"],
    exampleRows: [
      ["u_00001", "control", "0", "2026-06-01"],
      ["u_00002", "treatment", "0", "2026-06-01"],
    ],
    generate: () => binaryCsv(404, 3000, 0.062, 0.066),
  },
  {
    id: "revenue-per-user",
    name: "Revenue-per-User Test",
    description: "Per-user revenue including zeros for non-purchasers. Heavy-tailed demo data; the platform automatically adds a bootstrap CI.",
    requiredColumns: ["user_id", "variant", "revenue"],
    optionalColumns: ["exposure_timestamp"],
    analysisMethods: ["Welch's t-test", "Bootstrap CI", "SRM check"],
    header: ["user_id", "variant", "revenue", "exposure_timestamp"],
    exampleRows: [
      ["u_00001", "control", "0.00", "2026-06-01"],
      ["u_00002", "treatment", "24.99", "2026-06-01"],
    ],
    generate: () => revenueCsv(505, 10000, 0.09, 0.10, 38, 42),
  },
  {
    id: "retention",
    name: "Retention Test (D7)",
    description: "Binary D7 retention outcome per user. All users have aged through the retention window.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["signup_date"],
    analysisMethods: ["Two-proportion z-test", "SRM check"],
    header: ["user_id", "variant", "conversion", "exposure_timestamp"],
    exampleRows: [
      ["u_00001", "control", "1", "2026-05-01"],
      ["u_00002", "treatment", "0", "2026-05-01"],
    ],
    generate: () => binaryCsv(606, 8000, 0.22, 0.245),
  },
  {
    id: "cuped",
    name: "CUPED Test (with pre-period metric)",
    description: "Continuous outcome with a pre-experiment metric column for CUPED variance reduction (analysis support planned; validated on upload).",
    requiredColumns: ["user_id", "variant", "primary_metric", "pre_experiment_metric"],
    optionalColumns: ["exposure_timestamp"],
    analysisMethods: ["Welch's t-test (unadjusted in MVP)", "CUPED (future)"],
    header: ["user_id", "variant", "primary_metric", "pre_experiment_metric"],
    exampleRows: [
      ["u_00001", "control", "6.2", "5.8"],
      ["u_00002", "treatment", "7.9", "6.1"],
    ],
    generate: () => {
      const rand = prng(707);
      const rows = ["user_id,variant,primary_metric,pre_experiment_metric"];
      for (let i = 0; i < 6000; i++) {
        const variant = i % 2 === 0 ? "control" : "treatment";
        const base = 5 + rand() * 6;
        const lift = variant === "treatment" ? 0.35 : 0;
        const outcome = Math.max(0, base + lift + (rand() - 0.5) * 3);
        rows.push([`u_${String(i + 1).padStart(5, "0")}`, variant, outcome.toFixed(2), base.toFixed(2)].join(","));
      }
      return rows.join("\n");
    },
  },
  {
    id: "geo",
    name: "Geo Test",
    description: "Region-level weekly outcomes for a geo experiment. Each row is one geo-week; the geo is the randomization unit.",
    requiredColumns: ["unit_id", "variant", "primary_metric"],
    optionalColumns: ["timestamp"],
    analysisMethods: ["Welch's t-test on geo-level values"],
    header: ["unit_id", "variant", "primary_metric", "timestamp"],
    exampleRows: [
      ["chicago", "treatment", "412", "2026-06-01"],
      ["denver", "control", "238", "2026-06-01"],
    ],
    generate: () => {
      const rand = prng(808);
      const cities = ["atlanta", "austin", "boston", "chicago", "dallas", "denver", "detroit", "houston", "miami", "minneapolis", "phoenix", "portland", "seattle", "stlouis", "tampa", "orlando", "charlotte", "columbus", "kansascity", "sacramento"];
      const rows = ["unit_id,variant,primary_metric,timestamp"];
      cities.forEach((city, i) => {
        const variant = i % 2 === 0 ? "control" : "treatment";
        const base = 200 + rand() * 250;
        const lift = variant === "treatment" ? 1.12 : 1.0;
        rows.push([city, variant, Math.round(base * lift).toString(), "2026-06-01"].join(","));
      });
      return rows.join("\n");
    },
  },
  {
    id: "switchback",
    name: "Switchback Test",
    description: "Block-level outcomes for a switchback experiment. Each row is one time block; the block is the unit of analysis.",
    requiredColumns: ["unit_id", "variant", "primary_metric"],
    optionalColumns: ["timestamp"],
    analysisMethods: ["Welch's t-test on block-level values"],
    header: ["unit_id", "variant", "primary_metric", "timestamp"],
    exampleRows: [
      ["block_001", "control", "34.2", "2026-06-01T08:00"],
      ["block_002", "treatment", "31.7", "2026-06-01T10:00"],
    ],
    generate: () => {
      const rand = prng(909);
      const rows = ["unit_id,variant,primary_metric,timestamp"];
      for (let i = 0; i < 168; i++) {
        const variant = Math.floor(i / 2) % 2 === 0 ? "control" : "treatment";
        const hourEffect = 6 * Math.sin((i % 12) / 12 * Math.PI);
        const base = 32 + hourEffect + (rand() - 0.5) * 6;
        const effect = variant === "treatment" ? -2.2 : 0;
        const d = new Date(2026, 5, 1 + Math.floor(i / 12), (i % 12) * 2);
        rows.push([`block_${String(i + 1).padStart(3, "0")}`, variant, (base + effect).toFixed(1), d.toISOString().slice(0, 16)].join(","));
      }
      return rows.join("\n");
    },
  },
  {
    id: "funnel",
    name: "Funnel Test",
    description: "Multi-step funnel flags per user. The MVP analyzes the designated primary step (conversion column); other steps validate on upload for future funnel analysis.",
    requiredColumns: ["user_id", "variant", "conversion"],
    optionalColumns: ["visited", "started_trial", "activated", "paid"],
    analysisMethods: ["Two-proportion z-test on the primary step"],
    header: ["user_id", "variant", "conversion", "visited", "started_trial", "activated"],
    exampleRows: [
      ["u_00001", "control", "0", "1", "1", "0"],
      ["u_00002", "treatment", "1", "1", "1", "1"],
    ],
    generate: () => {
      const rand = prng(111);
      const rows = ["user_id,variant,conversion,visited,started_trial,activated"];
      for (let i = 0; i < 10000; i++) {
        const variant = i % 2 === 0 ? "control" : "treatment";
        const pTrial = variant === "control" ? 0.18 : 0.25;
        const pActGivenTrial = variant === "control" ? 0.5 : 0.42;
        const trial = rand() < pTrial ? 1 : 0;
        const act = trial && rand() < pActGivenTrial ? 1 : 0;
        rows.push([`u_${String(i + 1).padStart(5, "0")}`, variant, String(act), "1", String(trial), String(act)].join(","));
      }
      return rows.join("\n");
    },
  },
];

export function getTemplate(id: string): CsvTemplate | undefined {
  return CSV_TEMPLATES.find((t) => t.id === id);
}
