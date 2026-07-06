// Core data models for the experimentation platform.

export type BusinessFunction =
  | "marketing"
  | "product"
  | "growth"
  | "lifecycle"
  | "sales"
  | "operations"
  | "marketplace"
  | "pricing"
  | "retention"
  | "general";

export type MetricKind =
  | "binary"
  | "continuous"
  | "count"
  | "revenue"
  | "ratio"
  | "retention"
  | "time-to-event"
  | "ordinal"
  | "engagement"
  | "funnel";

export type Severity = "low" | "medium" | "high" | "not-recommended";

export interface ExperimentQuestion {
  raw: string;
  refined: string;
  businessFunction: BusinessFunction;
  decision: string;
  audience: string;
  currentExperience: string;
  proposedChange: string;
  expectedBehaviorChange: string;
  primaryKpi: string;
  metricKind: MetricKind;
  secondaryKpis: string[];
  guardrails: string[];
  risks: string[];
  dataNeeded: string[];
  testable: boolean;
  testableReason: string;
}

export interface FramingIssue {
  issue: string;
  severity: Severity;
  why: string;
  fix: string;
}

export interface ProblemFraming {
  problemStatement: string;
  businessContext: string;
  behaviorInfluenced: string;
  baselineAssumption: string;
  painPoint: string;
  expectedImpact: string;
  whyItMatters: string;
  decisionAfterTest: string;
  riskWithoutTesting: string;
  riskOfOverTesting: string;
  successLooksLike: string;
  inconclusiveLooksLike: string;
  harmfulLooksLike: string;
  issues: FramingIssue[];
  overallSeverity: Severity;
}

export interface Hypothesis {
  primary: string;
  nullHypothesis: string;
  alternative: string;
  directional: string;
  direction: "increase" | "decrease" | "two-sided";
  mdeRecommendation: string;
  successCriteria: string;
  failureCriteria: string;
  inconclusiveCriteria: string;
  practicalThreshold: string;
  riskAssumptions: string[];
}

export interface TestRecommendation {
  testId: string; // slug into the education catalog
  testName: string;
  whyThisFits: string;
  questionAnswered: string;
  requiredData: string[];
  assumptions: string[];
  limitations: string[];
  risks: string[];
  alternatives: { testId: string; name: string; when: string }[];
  confidenceLevel: number;
  mvpSupported: boolean;
  whyRecommendedLong: string;
}

export interface ExperimentDesign {
  experimentType: string;
  statisticalTest: string;
  control: string;
  treatment: string;
  numVariants: number;
  audience: string;
  inclusion: string;
  exclusion: string;
  randomizationUnit: "user" | "session" | "account" | "geo" | "time-block" | "cluster";
  randomizationMethod: string;
  split: string;
  durationWeeks: number;
  stoppingRules: string;
  decisionRules: string;
  rollout: string;
  warnings: string[];
}

export interface MetricDefinition {
  id: string;
  name: string;
  kind: MetricKind;
  role: "primary" | "secondary" | "guardrail" | "diagnostic";
  purpose: string;
  numerator: string;
  denominator: string;
  unitOfAnalysis: string;
  eventSource: string;
  timeWindow: string;
  inclusionLogic: string;
  exclusionLogic: string;
  expectedDirection: "increase" | "decrease" | "no-change";
  owner: string;
  caveats: string;
}

export interface PowerInputs {
  metricKind: "binary" | "continuous";
  baselineRate: number; // proportion for binary, mean for continuous
  stdDev: number; // for continuous
  mdeRelative: number; // relative effect, e.g. 0.10 = 10%
  alpha: number;
  power: number;
  allocation: number; // fraction of traffic to treatment, e.g. 0.5
  weeklyTraffic: number;
  twoSided: boolean;
}

export interface PowerResult {
  samplePerGroup: number;
  totalSample: number;
  estimatedWeeks: number;
  feasible: boolean;
  warnings: string[];
  absoluteMde: number;
}

export interface ValidationIssue {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  affectedRows: number;
  detail: string;
  whyItMatters: string;
  suggestedFix: string;
  blocksAnalysis: boolean;
}

export interface ParsedDataset {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export interface GroupStats {
  variant: string;
  n: number;
  conversions?: number;
  rate?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  total?: number;
}

export interface StatisticalResult {
  metricKind: MetricKind;
  method: string;
  groups: GroupStats[];
  comparisons: VariantComparison[];
  srm: SrmResult;
  classification: ResultClassification;
  multipleComparisonNote?: string;
}

export interface VariantComparison {
  control: string;
  treatment: string;
  absoluteLift: number;
  relativeLift: number;
  standardError: number;
  ciLow: number;
  ciHigh: number;
  statistic: number;
  pValue: number;
  pValueAdjusted?: number;
  significant: boolean;
  effectSize?: number;
  bootstrapCi?: [number, number];
}

export interface SrmResult {
  expectedSplit: number[];
  actualCounts: number[];
  variants: string[];
  chiSquare: number;
  pValue: number;
  mismatch: boolean;
}

export type ResultClassification =
  | "significant-meaningful"
  | "significant-not-meaningful"
  | "meaningful-not-significant"
  | "inconclusive"
  | "underpowered"
  | "harmful"
  | "data-quality-issue"
  | "needs-more-data";

export interface SegmentResult {
  segment: string;
  value: string;
  n: number;
  lift: number;
  pValue: number;
  significant: boolean;
}

export interface Interpretation {
  headline: string;
  statisticalResult: string;
  businessInterpretation: string;
  recommendation: RecommendationOption;
  recommendationDetail: string;
  caveats: string[];
  nextSteps: string[];
}

export type RecommendationOption =
  | "Ship"
  | "Do Not Ship"
  | "Iterate and Retest"
  | "Continue Test"
  | "Inconclusive"
  | "Needs Better Data"
  | "Rerun With Better Design"
  | "Use Different Test Type";

export interface Experiment {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "designed" | "analyzed" | "reported";
  step: number;
  question?: ExperimentQuestion;
  framing?: ProblemFraming;
  hypothesis?: Hypothesis;
  recommendation?: TestRecommendation;
  design?: ExperimentDesign;
  metrics?: MetricDefinition[];
  powerInputs?: PowerInputs;
  powerResult?: PowerResult;
  datasetMeta?: { fileName: string; rowCount: number; columns: string[] };
  validationIssues?: ValidationIssue[];
  result?: StatisticalResult;
  segments?: SegmentResult[];
  interpretation?: Interpretation;
  reportMarkdown?: string;
}

export interface SavedReport {
  id: string;
  experimentId: string;
  title: string;
  createdAt: string;
  markdown: string;
}

export interface AppSettings {
  confidenceLevel: number;
  power: number;
  trafficSplit: number;
  reportFormat: "markdown" | "html" | "pdf";
  statMethod: "frequentist" | "bayesian";
  metricPrefix: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  confidenceLevel: 0.95,
  power: 0.8,
  trafficSplit: 0.5,
  reportFormat: "markdown",
  statMethod: "frequentist",
  metricPrefix: "",
};
