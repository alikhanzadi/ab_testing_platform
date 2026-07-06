# AI-Guided Experimentation Platform Builder Prompt

You are a senior full-stack product engineer, experimentation scientist, data product leader, and Director of Product with 15+ years of experience building high-quality internal tools for Apple-level product, marketing, growth, analytics, and executive teams.

Build a browser-based AI-guided experimentation platform.

The platform has two major product areas:

1. **Experiment Builder & Analyzer**
2. **Experimentation Education Hub**

The product should help both technical and non-technical teams understand, design, run, analyze, and report experiments. It should be simple enough for marketing and product teams, but rigorous enough for data, analytics, growth, and experimentation teams.

The app should feel polished, calm, clean, and executive-ready. Avoid clutter. Use clear guided workflows, plain English explanations, strong validation, and professional report outputs.

The app should run in the browser first as an MVP, but the architecture should be extensible for future database, warehouse, analytics, and collaboration integrations.

---

## Product Area 1: Experiment Builder & Analyzer

### Core Objective

Build an AI-guided A/B testing platform where a team can enter a business question and be guided through:

- understanding the problem
- determining whether the question is testable
- constructing a hypothesis
- selecting the correct test type
- designing the experiment
- defining metrics
- estimating required sample size
- uploading experiment data by CSV
- validating the data
- analyzing results
- interpreting statistical and practical significance
- creating a polished report
- exporting the report

The main workflow should be:

1. Ask the Question
2. Frame the Problem
3. Build the Hypothesis
4. Select the Right Test
5. Design the Experiment
6. Define Metrics
7. Estimate Sample Size & Power
8. Upload CSV Data
9. Validate Data
10. Analyze Results
11. Interpret Findings
12. Generate Report

---

## 1. Ask the Question

The user starts by entering a business question.

Examples:

- “Will changing the onboarding email subject line increase activation?”
- “Does a new landing page improve signup conversion?”
- “Will a new pricing page increase trial starts?”
- “Does showing a creator profile video increase token purchases?”
- “Will a discount increase first purchase conversion?”
- “Does a new recommendation module increase engagement?”
- “Will changing the checkout flow reduce cart abandonment?”

The platform should identify:

- business function: marketing, product, growth, lifecycle, sales, operations, marketplace, pricing, retention, etc.
- business question
- decision being tested
- target audience
- current experience
- proposed change
- expected behavior change
- expected KPI movement
- primary KPI
- secondary KPIs
- guardrail metrics
- risks
- data needed
- whether the question is testable
- whether this should be an A/B test or another test type

If the question is vague, the AI should rewrite it into a clear experimentation question.

Example:

User question:

> Do users like the new onboarding?

Rewritten:

> Does the new onboarding flow increase account activation among first-time users compared with the current onboarding flow?

The app should ask clarifying questions only when necessary. Do not ask too many questions at once.

---

## 2. Frame the Problem

Create a guided problem-framing module.

The platform should output:

- refined business question
- problem statement
- business context
- user behavior being influenced
- current baseline assumption
- current pain point
- expected business impact
- why the experiment matters
- decision that will be made after the test
- risks of acting without testing
- risks of over-testing
- what would make the test successful
- what would make the test inconclusive
- what would make the test harmful

The platform should flag weak or invalid experiment ideas.

Flag issues such as:

- no measurable KPI
- unclear control group
- unclear treatment group
- no clear decision attached to the test
- multiple unrelated changes being tested at once
- sample size likely too small
- unclear audience
- treatment cannot be randomized
- randomization unit is ambiguous
- data is unavailable
- test would create ethical or customer trust risks
- result would not change a decision
- metric is too delayed to be useful
- metric can be easily gamed

The app should give a severity rating:

- Low concern
- Medium concern
- High concern
- Experiment not recommended

---

## 3. Build the Hypothesis

Create a hypothesis builder that teaches the user how to construct a strong hypothesis.

Use this structure:

> We believe that [change] for [audience] will cause [expected behavior change], resulting in [measurable KPI movement], because [reason].

The platform should generate:

- primary hypothesis
- null hypothesis
- alternative hypothesis
- directional expectation
- primary KPI definition
- secondary KPI definitions
- guardrail metric definitions
- minimum detectable effect recommendation
- success criteria
- failure criteria
- inconclusive criteria
- practical significance threshold
- risk assumptions

Example:

Primary hypothesis:

> We believe that simplifying the signup form for first-time visitors will increase completed signups because users will face less friction during onboarding.

Null hypothesis:

> Simplifying the signup form has no effect on completed signup rate.

Alternative hypothesis:

> Simplifying the signup form changes completed signup rate.

Directional alternative:

> Simplifying the signup form increases completed signup rate.

The hypothesis section should also include a link or expandable explanation titled:

**Why this test was recommended**

This explanation should describe:

- why the AI selected this specific test type
- why the hypothesis matches that test
- what metric type is being tested
- why the selected statistical method is appropriate
- what assumptions the test relies on
- what data is needed
- when this recommendation could be wrong
- what alternative tests could be considered

Example explanation:

> This was recommended as a standard two-sample A/B test because the team is comparing one control experience against one treatment experience, users can be randomly assigned, and the primary metric is binary conversion. A two-proportion z-test is appropriate if the sample size is large enough and each user appears in only one group. If randomization is not possible, this should not be treated as a standard A/B test.

---

## 4. Select the Right Test

The platform should recommend the most appropriate experiment or statistical test.

It should not assume every question is a standard A/B test.

The app should choose among:

- A/B test
- A/B/n test
- multivariate test
- holdout test
- feature flag rollout test
- pre/post test
- difference-in-differences
- switchback test
- geo experiment
- cluster randomized test
- matched-pair test
- sequential test
- Bayesian A/B test
- CUPED-adjusted A/B test
- non-inferiority test
- superiority test
- equivalence test
- retention cohort test
- funnel conversion test
- revenue-per-user test
- ratio metric test
- chi-square test
- t-test
- Welch’s t-test
- Mann-Whitney U test
- bootstrap test
- permutation test
- regression-adjusted experiment
- logistic regression test
- ANOVA
- power analysis
- sample ratio mismatch test

For each recommendation, show:

- recommended test
- why this test fits
- what question it answers
- required data
- assumptions
- limitations
- risks
- alternative tests
- confidence level recommendation
- whether statistical support is available in MVP

The platform should explain test selection in plain English.

Example:

> If you are comparing two landing pages and the outcome is signup conversion, use a standard A/B test with a two-proportion z-test. If you are comparing three landing pages, use an A/B/n test and correct for multiple comparisons.

---

## 5. Design the Experiment

Create a guided experiment design module.

The platform should recommend:

- experiment type
- statistical test
- control group
- treatment group
- number of variants
- target audience
- inclusion criteria
- exclusion criteria
- randomization unit
- randomization method
- sample split
- experiment duration
- minimum sample size
- expected baseline rate
- minimum detectable effect
- primary metric
- secondary metrics
- guardrail metrics
- segmentation plan
- tracking requirements
- event definitions
- data schema
- stopping rules
- decision rules
- rollout recommendation

The platform should explain the tradeoffs.

For example:

- user-level randomization prevents users from seeing multiple experiences
- session-level randomization is easier but can contaminate user behavior
- account-level randomization is better for B2B products
- geo testing is useful when user-level randomization is not possible
- switchback testing is useful when supply, marketplace, or time effects matter
- holdouts are useful for measuring long-term incrementality

The platform should prevent poor design decisions.

Warn against:

- changing targeting mid-test
- changing the treatment during the test
- stopping early because results look good
- ignoring guardrail metrics
- using overlapping audiences
- testing too many unrelated changes
- launching during unusual seasonality
- using too small a sample
- using an outcome metric that occurs too late
- using metrics with unclear definitions
- analyzing users who were not exposed
- including users in both variants
- ignoring sample ratio mismatch

---

## 6. Define Metrics

Create a metrics definition module.

For each metric, capture:

- metric name
- metric type
- business purpose
- numerator
- denominator
- unit of analysis
- event source
- time window
- inclusion logic
- exclusion logic
- expected direction
- owner
- caveats

Metric types:

- binary conversion
- continuous value
- count
- revenue
- ratio
- retention
- time-to-event
- ordinal rating
- engagement frequency
- funnel completion

The platform should support:

- primary metric
- secondary metrics
- guardrail metrics
- diagnostic metrics

Examples:

Primary metric:

> Signup conversion rate

Definition:

> Number of visitors who complete signup divided by number of eligible visitors exposed to the landing page.

Guardrail metric:

> Refund rate

Definition:

> Number of users who request a refund divided by number of users who purchased.

The app should warn when:

- the metric is not tied to the hypothesis
- the metric can be gamed
- the metric is too delayed
- the metric is not available in uploaded data
- numerator and denominator are unclear
- unit of analysis does not match randomization unit

---

## 7. Sample Size, Power, and Duration

Add power analysis.

The platform should estimate:

- baseline conversion rate or baseline mean
- desired minimum detectable effect
- significance level
- power
- required sample size per group
- total required sample size
- expected traffic volume
- estimated duration
- whether the test is likely feasible

Defaults:

- confidence level: 95%
- alpha: 0.05
- power: 80%
- split: 50/50
- two-sided test unless directional testing is clearly justified

The user should be able to edit:

- baseline metric
- minimum detectable effect
- expected traffic
- confidence level
- power
- allocation ratio

Explain:

- smaller effects require larger samples
- lower traffic means longer test duration
- higher confidence requires more sample
- underpowered tests are more likely to be inconclusive
- statistical significance does not always mean business significance

The app should warn:

- “This test is likely underpowered.”
- “The required duration may be too long.”
- “The expected lift is smaller than the platform can reliably detect.”
- “This test may need a larger audience or a more sensitive metric.”

---

## 8. Advanced Statistical Features

Add support or clear future-ready placeholders for advanced experimentation methods.

### CUPED

Include CUPED as an optional analysis method when pre-experiment data is available.

Explain:

CUPED uses pre-experiment behavior to reduce variance and improve sensitivity.

Require:

- user_id
- variant
- outcome metric
- pre-experiment metric

Use when:

- users have historical behavior
- metric is noisy
- pre-period behavior predicts post-period behavior

Warn when:

- no pre-period data exists
- pre-period metric is unrelated to outcome
- new users have no history

### Sequential Testing

Include a sequential testing module or warning system.

Explain:

Sequential testing allows interim reads while controlling false positives.

Use when:

- teams need to monitor results during the test
- stopping early is likely
- high-traffic experiments run continuously

Warn:

> Do not repeatedly check p-values and stop when the result looks good unless sequential correction is used.

### Sample Ratio Mismatch

Always run sample ratio mismatch checks.

Detect:

- expected split
- actual split
- deviation
- chi-square test result
- severity

Warn:

> Sample ratio mismatch may indicate assignment, logging, or data pipeline issues. Do not trust the result until this is investigated.

### Multiple Comparisons

Detect multiple variants, multiple metrics, or many segment cuts.

Warn:

> Testing many comparisons increases the chance of false positives.

Support:

- Bonferroni correction
- Benjamini-Hochberg false discovery rate
- clear labeling of exploratory segment analysis

### Bayesian A/B Testing

Include Bayesian A/B testing as an optional method or future-ready module.

For binary outcomes, estimate:

- posterior distribution
- probability treatment is better
- expected lift
- credible interval

Explain clearly that Bayesian probability is not the same as frequentist p-value.

### Non-Inferiority and Equivalence Tests

Support scenarios where the goal is not necessarily to improve a metric.

Use non-inferiority when:

- new design is cheaper
- new flow is simpler
- new system is faster
- goal is to prove it is not meaningfully worse

Use equivalence when:

- goal is to show two options are practically similar

Require:

- non-inferiority margin
- equivalence margin
- business justification

### Regression Adjustment

Support regression-adjusted analysis when covariates are available.

Possible covariates:

- country
- device
- channel
- user tenure
- pre-period behavior
- customer segment

Warn:

> Regression adjustment should improve precision, not rescue bad randomization.

### Bootstrap and Permutation Tests

Support bootstrap confidence intervals and permutation tests for metrics that are skewed, non-normal, or hard to model.

Use for:

- revenue
- session duration
- order value
- heavy-tailed metrics
- small samples

---

## 9. CSV Upload

Allow users to upload CSV data after the experiment.

Required columns:

- unit_id or user_id
- variant
- primary_metric
- timestamp or experiment_date

Optional columns:

- secondary_metric
- conversion
- revenue
- count_metric
- pre_experiment_metric
- segment
- country
- device
- channel
- campaign
- signup_date
- exposure_timestamp
- event_timestamp
- account_id
- session_id
- treatment_exposure
- guardrail_metric

The platform should support multiple CSV templates:

- simple binary conversion test
- continuous metric test
- revenue test
- CUPED test
- A/B/n test
- segment analysis test
- geo test
- switchback test

CSV validation should detect:

- missing required columns
- invalid variant names
- duplicate users
- users appearing in multiple variants
- missing values
- mixed data types
- impossible values
- negative revenue where not allowed
- unbalanced sample sizes
- sample ratio mismatch
- outliers
- timestamp issues
- pre-test data mixed with post-test data
- treatment exposure missing
- inconsistent metric definitions

If data is invalid, provide:

- issue description
- severity
- affected rows
- why it matters
- suggested fix
- whether analysis can continue

---

## 10. Statistical Analysis

The platform should automatically detect the metric type.

Metric types:

- binary conversion
- continuous metric
- count metric
- revenue metric
- ratio metric
- retention metric
- ordinal metric

For binary metrics, calculate:

- control conversion rate
- treatment conversion rate
- absolute lift
- relative lift
- standard error
- confidence interval
- z-test
- p-value
- statistical significance
- practical significance

For continuous metrics, calculate:

- mean by group
- median by group
- standard deviation
- variance
- standard error
- confidence interval
- t-test
- Welch’s t-test
- effect size

For revenue metrics, calculate:

- ARPU
- median revenue
- total revenue
- revenue lift
- confidence interval
- outlier warning
- bootstrap confidence interval if needed

For ratio metrics, calculate:

- numerator
- denominator
- group-level ratio
- delta method estimate or bootstrap estimate
- confidence interval
- caveat about ratio instability

For A/B/n tests, calculate:

- each variant result
- comparison to control
- multiple-comparison correction
- best-performing variant
- uncertainty warning

For segment analysis, calculate:

- segment-level lift
- sample size per segment
- significance per segment
- warning for exploratory analysis
- warning for false positives

The platform should classify the result as:

- Statistically significant and practically meaningful
- Statistically significant but not practically meaningful
- Practically meaningful but not statistically significant
- Inconclusive
- Underpowered
- Harmful
- Data quality issue detected
- Requires more data

Do not overstate results.

Avoid saying “winner” unless the evidence is strong.

---

## 11. Result Interpretation

Create an AI interpretation layer.

It should answer:

- What happened?
- Did treatment outperform control?
- Was the result statistically significant?
- Was the effect practically meaningful?
- Was the test sufficiently powered?
- Were there data quality issues?
- Did secondary metrics support the result?
- Did guardrail metrics show harm?
- Were there meaningful segment differences?
- Can the team ship the change?
- Should the test continue?
- Should the team retest?
- What are the caveats?
- What should the team do next?

Use plain English.

Example:

> The treatment increased signup conversion by 6.4%, but the result was not statistically significant at the 95% confidence level. This means the observed lift may be due to random variation. Because the sample size was below the recommended threshold, this test should be considered inconclusive rather than a failed treatment.

The AI should separate:

- statistical result
- business interpretation
- recommendation
- caveats

---

## 12. Report Generation

Generate a polished experiment report.

Report sections:

- Executive Summary
- Business Question
- Problem Statement
- Hypothesis
- Recommended Test Type
- Why This Test Was Used
- Experiment Design
- Audience and Randomization
- Metrics
- Sample Size and Power
- Data Quality Checks
- Results
- Statistical Interpretation
- Practical Significance
- Segment Analysis
- Guardrail Review
- Risks and Caveats
- Recommendation
- Next Steps
- Appendix

Recommendation options:

- Ship
- Do Not Ship
- Iterate and Retest
- Continue Test
- Inconclusive
- Needs Better Data
- Rerun With Better Design
- Use Different Test Type

The report should be exportable as:

- Markdown
- PDF
- HTML
- copyable text

The report should include clear language for executives.

Example executive summary:

> The redesigned landing page increased signup conversion from 8.2% to 9.1%, a relative lift of 11.0%. The result was statistically significant at the 95% confidence level and passed guardrail checks. We recommend shipping the treatment to 100% of eligible traffic while continuing to monitor refund rate and downstream activation.

---

## Product Area 2: Experimentation Education Hub

Create a separate tab/page called:

**Experimentation Guide**

This should be a structured educational section of the app.

The purpose is to help marketing, growth, product, analytics, and data teams understand different experiment and hypothesis test types.

The guide should be useful for both beginners and advanced users.

The tone should be practical, clear, and example-heavy.

The user mentioned that their guiding reference has been *Hypothesis Testing* by Jim Frost, so the educational style should be accessible and plain-English, but it should also go beyond basic hypothesis testing and include modern experimentation methods used in small, medium, and large companies.

Do not copy the book. Build an original, product-oriented guide.

---

## 13. Education Hub Structure

The Education Hub should have:

- search
- filters
- categories
- difficulty level
- use-case tags
- test comparison table
- detailed test pages
- examples
- limitations
- data requirements
- common mistakes
- when not to use
- link back to Experiment Builder

Categories:

1. Experiment Design Types
2. Classical Hypothesis Tests
3. Product and Growth Experiments
4. Marketing Experiments
5. Marketplace and Operations Experiments
6. Advanced Experimentation Methods
7. Data Quality and Validity Checks
8. Power, Sample Size, and Sensitivity
9. Metric Design
10. Decision-Making and Reporting

Each test page should include:

- test name
- plain-English explanation
- what question it answers
- example business use cases
- hypothesis format
- null hypothesis example
- alternative hypothesis example
- data needed
- metric types supported
- assumptions
- how to run it conceptually
- how to interpret results
- drawbacks and limitations
- common mistakes
- when not to use it
- company-style example
- sample CSV schema
- related tests
- link to build this test in the main app

---

## 14. Test Catalog

The Education Hub should include at least the following test and experiment types.

### A/B Test

Use when comparing one control against one treatment.

Examples:

- old landing page vs new landing page
- current checkout vs simplified checkout
- existing onboarding email vs new subject line

Explain:

- best for simple controlled comparisons
- requires random assignment
- works well for conversion, revenue, engagement, and retention metrics
- can be misleading if sample size is too small

### A/B/n Test

Use when comparing multiple treatments against one control.

Examples:

- three pricing page versions
- four email subject lines
- multiple CTA button labels

Explain:

- useful for testing multiple variants
- increases false positive risk
- requires multiple comparison correction
- needs larger sample size

### Multivariate Test

Use when testing combinations of multiple elements.

Examples:

- headline + image + CTA combinations
- pricing layout + trial message + testimonial block

Explain:

- useful for understanding interaction effects
- requires much larger sample size
- difficult for low-traffic products

### Holdout Test

Use when withholding a feature, campaign, or experience from a small group to measure incrementality.

Examples:

- marketing campaign holdout
- recommendation engine holdout
- loyalty program holdout

Explain:

- useful for long-term measurement
- can be politically hard because some users do not receive the feature
- requires careful governance

### Feature Rollout Test

Use when gradually releasing a feature.

Examples:

- 5%, 25%, 50%, 100% rollout
- monitoring new checkout
- releasing a new recommendation module

Explain:

- useful for risk management
- not always a clean experiment unless randomization is preserved
- should include guardrails

### Pre/Post Test

Use when randomization is not possible and comparing before vs after.

Examples:

- site-wide homepage change
- pricing change launched to all users
- sales process change

Explain:

- easy to run
- weak causal evidence
- vulnerable to seasonality, trend, and external events

### Difference-in-Differences

Use when comparing treated and untreated groups before and after a change.

Examples:

- launch in one region but not another
- policy change for one customer group
- pricing change in one market

Explain:

- stronger than simple pre/post
- requires parallel trends assumption
- can be invalid if groups were already trending differently

### Switchback Test

Use when treatment must vary by time period rather than by user.

Examples:

- marketplace ranking algorithm
- delivery dispatch logic
- support routing system
- pricing algorithm by time block

Explain:

- useful for marketplace and operations systems
- vulnerable to time-based confounding
- requires careful scheduling

### Geo Experiment

Use when randomizing by geography.

Examples:

- TV campaign by city
- regional discount
- paid marketing incrementality
- offline advertising

Explain:

- useful when user-level randomization is not possible
- requires similar regions
- can be affected by spillover

### Cluster Randomized Test

Use when users are grouped and cannot be independently randomized.

Examples:

- schools
- companies
- teams
- cities
- stores

Explain:

- accounts for group-level assignment
- needs more sample because observations within clusters are correlated

### Two-Proportion Z-Test

Use for binary conversion metrics.

Examples:

- signup conversion
- purchase conversion
- email click rate
- activation rate

Explain:

- compares two proportions
- requires enough successes and failures in each group
- not ideal for tiny samples

### Chi-Square Test

Use for categorical outcomes.

Examples:

- distribution of plan selections
- device type distribution
- user preference categories

Explain:

- tests whether distributions differ
- does not measure size or direction of effect by itself

### T-Test

Use for comparing two group means.

Examples:

- average order value
- average session duration
- average revenue per user

Explain:

- assumes roughly normal means or large samples
- sensitive to outliers

### Welch’s T-Test

Use when comparing two means with unequal variances.

Examples:

- revenue per user when control and treatment have different variance
- engagement time with unequal spread

Explain:

- safer default than standard t-test for many business metrics

### Mann-Whitney U Test

Use when comparing distributions that are not normally distributed.

Examples:

- skewed engagement
- session duration
- revenue values with outliers

Explain:

- non-parametric
- does not directly compare means
- interpretation can be less intuitive

### ANOVA

Use when comparing means across more than two groups.

Examples:

- three onboarding designs
- four price presentation formats
- multiple promotion levels

Explain:

- tells whether at least one group differs
- requires follow-up tests to identify which group differs

### Bootstrap Test

Use when metric distribution is complex or skewed.

Examples:

- revenue
- order value
- usage depth
- creator earnings

Explain:

- flexible
- computationally heavier
- depends on representative sampling

### Permutation Test

Use when you want fewer distributional assumptions.

Examples:

- small samples
- unusual metrics
- skewed outcomes

Explain:

- intuitive and flexible
- may be computationally expensive

### Bayesian A/B Test

Use when teams want probability-style interpretation.

Examples:

- “What is the probability treatment is better?”
- “What is the expected loss if we ship?”
- “What is the probability lift exceeds 2%?”

Explain:

- easier for product decisions
- depends on prior assumptions
- different from p-values

### Sequential Test

Use when interim monitoring is expected.

Examples:

- high-traffic checkout test
- critical conversion funnel test
- growth experiments monitored daily

Explain:

- allows earlier stopping if designed correctly
- standard repeated p-value checking inflates false positives

### CUPED

Use when pre-experiment behavior can reduce variance.

Examples:

- users with past purchase behavior
- users with historical engagement
- returning customer tests

Explain:

- improves sensitivity
- requires reliable pre-period metric
- not useful for brand-new users without history

### Non-Inferiority Test

Use when the new version can be slightly worse but has other benefits.

Examples:

- cheaper infrastructure
- simpler UI
- faster checkout
- lower operational cost

Explain:

- requires pre-defined acceptable loss margin
- useful when “not worse by too much” is acceptable

### Equivalence Test

Use when goal is to prove two options are practically similar.

Examples:

- replacing a vendor
- changing backend system
- redesign that should preserve conversion

Explain:

- different from failing to reject a difference
- requires equivalence margin

### Regression-Adjusted Experiment

Use when covariates improve precision.

Examples:

- controlling for country, device, channel, tenure
- adjusting for pre-period activity

Explain:

- can improve precision
- should not fix bad experimental design

### Logistic Regression

Use for binary outcomes with covariates.

Examples:

- conversion with device, country, and channel controls
- churn yes/no with segment controls

Explain:

- useful for adjusted binary analysis
- harder to explain to non-technical users

### Retention Cohort Test

Use for measuring whether a treatment affects retention.

Examples:

- D1, D7, D30 retention
- repeat purchase
- subscription renewal

Explain:

- requires waiting for retention window
- can be delayed and underpowered

### Funnel Test

Use for multi-step conversion paths.

Examples:

- visit → signup → activation → purchase
- email open → click → signup
- cart → checkout → payment

Explain:

- identifies where treatment helps or hurts
- multiple steps create multiple comparison issues

### Ratio Metric Test

Use when metric is a ratio.

Examples:

- revenue per visitor
- clicks per impression
- purchases per session
- messages per active user

Explain:

- ratio metrics can be unstable
- numerator and denominator must be clearly defined

### Sample Ratio Mismatch Test

Use to validate assignment integrity.

Examples:

- expected 50/50 split but actual is 60/40
- traffic allocation bug
- logging failure

Explain:

- detects randomization or data pipeline problems
- serious SRM can invalidate the experiment

---

## 15. Education Hub Examples

Each test page should include comprehensive examples.

For each example, include:

- business context
- question
- hypothesis
- control
- treatment
- metric
- data needed
- test selected
- why selected
- expected result interpretation
- limitation

Example for A/B test:

Business context:

> A SaaS company wants to improve trial signup conversion.

Question:

> Does reducing the signup form from six fields to three fields increase trial signup conversion?

Hypothesis:

> We believe that reducing the signup form for first-time visitors will increase trial signup conversion because users will face less friction.

Control:

> Current six-field form.

Treatment:

> New three-field form.

Primary metric:

> Trial signup conversion rate.

Data needed:

> user_id, variant, signup_completed, exposure_timestamp.

Recommended test:

> Two-proportion z-test.

Why:

> The metric is binary and the team is comparing one control against one treatment.

Limitation:

> If signup quality decreases, the test may look successful while hurting downstream activation.

Guardrail:

> Activation rate within seven days.

---

## 16. Link Between Main App and Education Hub

The main Experiment Builder should link to the Education Hub.

In the hypothesis and test selection sections, add:

- “Why this test?”
- “Learn about this test”
- “See examples”
- “View assumptions”
- “Compare with alternatives”

When the AI recommends a test, it should link to the matching Education Hub page.

Example:

Recommended test:

> Two-proportion z-test

Link:

> Learn why this test is used for binary conversion metrics.

The linked page should explain:

- what the test does
- why it was selected
- what assumptions must hold
- what data is required
- what limitations exist
- what alternative tests might apply

---

## 17. App Navigation

Create the following top-level navigation:

1. Dashboard
2. New Experiment
3. Analyze Results
4. Reports
5. Experimentation Guide
6. Templates
7. Settings

### Dashboard

Show:

- recent experiments
- draft experiments
- completed reports
- common test types
- quick start button

### New Experiment

Launch the full guided workflow.

### Analyze Results

Allow direct CSV upload and analysis without going through full planning.

### Reports

Store generated reports locally.

### Experimentation Guide

Open the educational test catalog.

### Templates

Provide CSV templates, report templates, and experiment design templates.

### Settings

Allow configuration of:

- default confidence level
- default power
- default traffic split
- default report format
- preferred statistical method
- company metric naming conventions

---

## 18. UI Requirements

Use a clean, modern, professional interface.

Design principles:

- minimal but not empty
- guided but not childish
- clear hierarchy
- plain English first
- advanced details available in expandable sections
- warnings should be calm and precise
- reports should look executive-ready

Use visual components:

- stepper workflow
- cards
- side panels
- editable forms
- validation banners
- comparison tables
- result summary cards
- confidence interval visualization
- metric definition cards
- test recommendation cards
- report preview panel

Avoid:

- cluttered dashboards
- excessive colors
- overly playful UI
- unexplained statistical jargon
- raw notebook-like outputs

---

## 19. Technical Requirements

Preferred stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- local browser state first
- CSV parsing library
- statistical analysis utilities
- charting library
- report export functionality

The MVP should work without backend dependency.

Use local storage or IndexedDB for:

- draft experiments
- uploaded CSV metadata
- generated reports
- saved templates
- education hub bookmarks

Suggested components:

- AppShell
- Navigation
- Dashboard
- NewExperimentWorkflow
- QuestionIntake
- ProblemFraming
- HypothesisBuilder
- TestSelector
- ExperimentDesigner
- MetricDesigner
- PowerCalculator
- CSVUploader
- DataValidator
- StatisticalAnalyzer
- ResultInterpreter
- ReportGenerator
- EducationHub
- TestCatalog
- TestDetailPage
- TemplateLibrary
- ExportControls
- Settings

Suggested data models:

- ExperimentQuestion
- ProblemStatement
- Hypothesis
- TestRecommendation
- ExperimentDesign
- MetricDefinition
- PowerAnalysisInput
- PowerAnalysisResult
- UploadedDataset
- ValidationIssue
- ValidationResult
- StatisticalResult
- SegmentResult
- ExperimentReport
- EducationTestEntry
- CSVTemplate

---

## 20. AI Behavior Requirements

The AI should act like a senior experimentation partner.

It should:

- be precise
- challenge weak thinking
- ask only necessary questions
- explain tradeoffs
- recommend appropriate test types
- identify invalid designs
- explain statistical assumptions
- prevent misleading conclusions
- distinguish statistical and practical significance
- avoid overconfidence
- produce executive-ready summaries
- teach the user while guiding them

The AI should not:

- claim certainty when results are weak
- ignore data quality issues
- recommend shipping based only on p-value
- treat every question as a standard A/B test
- hide assumptions
- use jargon without explanation
- let users proceed without warnings when the design is invalid
- confuse correlation with causation
- overinterpret segment results

---

## 21. Demo Data and Templates

Include sample CSV templates for:

- landing page conversion test
- email subject line test
- onboarding flow test
- pricing page test
- revenue-per-user test
- retention test
- CUPED test
- A/B/n test
- geo test
- switchback test
- funnel test

Each template should include:

- required columns
- optional columns
- example rows
- description
- supported analysis methods

---

## 22. MVP Success Criteria

The MVP is successful if a user can:

- enter a business question
- receive a refined problem statement
- generate a hypothesis
- understand why a specific test is recommended
- design an experiment
- define metrics
- estimate sample size and duration
- upload CSV data
- validate data quality
- analyze the result
- interpret statistical and practical significance
- generate a polished report
- export the report
- open the Education Hub
- search for test types
- learn when each test is used
- view examples, limitations, assumptions, and data requirements

---

## 23. Future Extensibility

Structure the app so it can later support:

- user accounts
- experiment history
- database-backed storage
- Snowflake integration
- BigQuery integration
- Redshift integration
- Looker integration
- Amplitude integration
- Mixpanel integration
- Segment integration
- dbt metric catalog integration
- semantic metric layer
- approval workflows
- experiment registry
- team collaboration
- feature flag integrations
- automated assignment checks
- automatic experiment monitoring
- scheduled report generation
- AI-generated stakeholder summaries

Build the first version as a working, browser-based MVP, but design the product like a serious internal experimentation platform for a high-performing product organization.
