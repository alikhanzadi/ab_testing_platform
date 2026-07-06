# Experiment Studio — AI-Guided Experimentation Platform

A browser-based MVP for designing, running, analyzing, and reporting experiments. Built for both non-technical teams (marketing, product, growth) and technical teams (data, analytics, experimentation). No backend required — all state lives in local browser storage.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Product areas

### 1. Experiment Builder & Analyzer
A 12-step guided workflow (`New Experiment`):

1. **Ask the Question** — enter a business question; the guidance engine identifies the business function, audience, proposed change, primary KPI and metric type, secondary KPIs, guardrails, and rewrites vague questions into testable ones.
2. **Frame the Problem** — problem statement, decision at stake, success/inconclusive/harmful criteria, and flagged design concerns with severity ratings.
3. **Build the Hypothesis** — primary/null/alternative/directional hypotheses, success criteria, practical significance threshold, and "Why this test was recommended".
4. **Select the Right Test** — recommends among A/B, A/B/n, switchback, geo, diff-in-diff, retention cohort, revenue-per-user, and more (not everything is a standard A/B test), with assumptions, limitations, risks, and alternatives linked into the Guide.
5. **Design the Experiment** — editable control/treatment, randomization unit with tradeoff guidance, split, duration, stopping and decision rules, and design-mistake warnings.
6. **Define Metrics** — primary/secondary/guardrail metric cards with numerator/denominator definitions.
7. **Sample Size & Power** — power analysis for binary and continuous metrics with feasibility warnings (underpowered, too long, MDE too small).
8. **Upload CSV Data** — drag-and-drop upload (PapaParse) or one-click demo datasets.
9. **Validate Data** — missing columns, duplicate users, cross-variant contamination, mixed types, negative values, outliers, timestamp issues, and a mandatory sample-ratio-mismatch check.
10. **Analyze Results** — auto-detects metric type; two-proportion z-test, Welch's t-test, bootstrap CIs for heavy tails, Benjamini-Hochberg correction for A/B/n, exploratory segment analysis, and an optional Bayesian view (Beta-Binomial Monte Carlo).
11. **Interpret Findings** — plain-English classification (significant & meaningful / significant but trivial / underpowered / harmful / data-quality issue…), separated into statistical result, business interpretation, recommendation, and caveats.
12. **Generate Report** — executive-ready report exportable as Markdown, HTML, PDF (print), or copyable text; saved to the Reports library.

`Analyze Results` in the nav offers the same validation → analysis → interpretation pipeline for a CSV without the planning workflow.

### 2. Experimentation Education Hub
`Experimentation Guide`: a searchable, filterable catalog of 30+ experiment designs and hypothesis tests across 10 categories, each with plain-English explanation, use cases, hypothesis formats, assumptions, how-to-run/interpret guidance, limitations, common mistakes, when-not-to-use, a full worked company-style example, a sample CSV schema, related tests, bookmarks, and a comparison table view. Every test recommendation in the builder links to its Guide page.

## Structure

- `src/lib/stats.ts` — distributions, z/t tests, chi-square, bootstrap, BH/Bonferroni, Bayesian Beta-Binomial
- `src/lib/power.ts` — sample size / duration / feasibility
- `src/lib/guidance.ts` — rule-based question parsing, framing, hypothesis generation, test selection
- `src/lib/validate.ts` — CSV validation incl. SRM
- `src/lib/analyze.ts` — metric-type detection and analysis engine
- `src/lib/interpret.ts` — result classification and plain-English narrative
- `src/lib/report.ts` — report generation and export
- `src/lib/storage.ts` — localStorage persistence behind a small interface (swap for a backend later)
- `src/data/testCatalog.ts` — Education Hub content
- `src/data/csvTemplates.ts` — CSV templates + deterministic demo data generators

## Extensibility

Storage, analysis, and guidance are isolated modules so future versions can add accounts, warehouse integrations (Snowflake/BigQuery/Redshift), analytics sources (Amplitude/Mixpanel/Segment), a semantic metric layer, approval workflows, experiment registry, feature-flag integrations, and automated monitoring without rewriting the UI.
