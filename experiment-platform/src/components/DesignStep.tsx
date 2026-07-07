"use client";

// Step 5 of the workflow: Design the Experiment.
// Two modes:
//  - Guided setup: plain-English questions for non-technical users (default).
//    Every statistical choice is presented as a business scenario with a
//    recommended default and a one-line explanation of the consequence.
//  - Advanced editor: the direct form for users with experimental design
//    experience.

import { useState } from "react";
import { Badge, Banner, Button, Card, Expandable, Field, KV, SectionTitle, inputCls } from "./ui";
import type { ExperimentDesign, PowerResult } from "@/lib/types";

type Unit = ExperimentDesign["randomizationUnit"];

const UNIT_CHOICES: { value: Unit; title: string; desc: string; when: string; recommended?: boolean; warning?: boolean }[] = [
  {
    value: "user",
    title: "Individual people",
    desc: "Each person is randomly given one version and always sees that same version.",
    when: "Best for most website, app, email, and onboarding tests.",
    recommended: true,
  },
  {
    value: "account",
    title: "Companies or teams",
    desc: "Everyone in the same company or team sees the same version.",
    when: "Best for B2B products — teammates share screens and workflows.",
  },
  {
    value: "geo",
    title: "Cities or regions",
    desc: "Whole regions get one version; comparable regions are the comparison.",
    when: "Use for TV, radio, billboards, or anything you can't split per person.",
  },
  {
    value: "time-block",
    title: "Time periods",
    desc: "The whole system alternates between versions on a schedule.",
    when: "Use for pricing, dispatch, or ranking systems that everyone shares at once.",
  },
  {
    value: "session",
    title: "Visits (sessions)",
    desc: "Each visit is assigned separately — the same person may see both versions on different days.",
    when: "Only for changes users won't notice or remember between visits.",
    warning: true,
  },
];

const UNIT_METHOD: Record<Unit, string> = {
  user: "Deterministic hash of user ID into stable buckets at first exposure",
  session: "Random assignment per session at session start",
  account: "Deterministic hash of account ID — all members of an account share a variant",
  geo: "Random assignment of matched regions to treatment and control",
  "time-block": "Randomized schedule of time blocks, balanced across hours and days of week",
  cluster: "Random assignment of whole clusters (stores, teams, schools)",
};

const SPLIT_CHOICES: { value: string; title: string; desc: string; recommended?: boolean }[] = [
  {
    value: "50 / 50",
    title: "Half and half (50/50)",
    desc: "Both versions get equal traffic. This reaches a reliable answer fastest.",
    recommended: true,
  },
  {
    value: "70 / 30",
    title: "Mostly current (70/30)",
    desc: "Only 30% see the new version. A bit safer if you're nervous about it, but the test takes about 1.2× longer.",
  },
  {
    value: "90 / 10",
    title: "Cautious (90/10)",
    desc: "Only 10% see the new version. Very low risk, but the test takes nearly 3× longer to reach an answer.",
  },
];

const AUDIENCE_PRESETS = ["All visitors", "New visitors only", "Existing customers", "Mobile app users", "Email subscribers"];

const EXCLUSION_PRESETS: { id: string; label: string; text: string }[] = [
  { id: "internal", label: "Employees and internal test accounts", text: "internal/test accounts" },
  { id: "bots", label: "Bots and automated traffic", text: "bots" },
  { id: "preexposed", label: "People who saw the change before the test started", text: "users exposed before the experiment start" },
  { id: "overlap", label: "People already in another experiment on the same page", text: "users in overlapping experiments" },
];

const DURATION_CHOICES = [1, 2, 3, 4, 6, 8];

function ChoiceCard({
  selected,
  onClick,
  title,
  desc,
  when,
  recommended,
  warning,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  when?: string;
  recommended?: boolean;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"}`}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {recommended && <Badge tone="green">Recommended</Badge>}
        {warning && <Badge tone="amber">Use with care</Badge>}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
      {when && <p className="mt-1 text-xs text-slate-400">{when}</p>}
    </button>
  );
}

function QuestionCard({ step, title, help, children }: { step: number; title: string; help: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{step}</span>
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{help}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function DesignStep({
  design,
  powerResult,
  onChange,
  onBack,
  onNext,
}: {
  design: ExperimentDesign;
  powerResult?: PowerResult;
  onChange: (d: ExperimentDesign) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<"guided" | "advanced">("guided");

  const set = (patch: Partial<ExperimentDesign>) => onChange({ ...design, ...patch });

  const setUnit = (unit: Unit) => set({ randomizationUnit: unit, randomizationMethod: UNIT_METHOD[unit] });

  const exclusionChecked = (text: string) => design.exclusion.toLowerCase().includes(text.toLowerCase());
  const toggleExclusion = (text: string) => {
    const active = EXCLUSION_PRESETS.filter((p) => (p.text === text ? !exclusionChecked(p.text) : exclusionChecked(p.text))).map((p) => p.text);
    const rebuilt = active.length > 0 ? active.map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t)).join(", ") : "No exclusions";
    set({ exclusion: rebuilt });
  };

  const recommendedWeeks = powerResult && Number.isFinite(powerResult.estimatedWeeks) ? Math.min(8, Math.max(2, Math.ceil(powerResult.estimatedWeeks))) : 2;
  const durations = [...new Set([...DURATION_CHOICES, recommendedWeeks])].sort((x, y) => x - y);

  const unitChoice = UNIT_CHOICES.find((u) => u.value === design.randomizationUnit);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">How would you like to set up the design?</p>
            <p className="mt-0.5 text-sm text-slate-500">Both modes produce the same experiment design — pick the one that matches your comfort level.</p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setMode("guided")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "guided" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Guide me
            </button>
            <button
              onClick={() => setMode("advanced")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "advanced" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Advanced editor
            </button>
          </div>
        </div>
        {mode === "guided" && (
          <p className="mt-3 rounded-lg bg-blue-50/60 px-3 py-2 text-xs text-slate-500">
            No statistics background needed — answer the questions below in plain business terms. Recommended options are marked, and every choice explains its
            consequence. You can switch to the advanced editor at any time without losing your answers.
          </p>
        )}
      </Card>

      {mode === "guided" ? (
        <>
          <QuestionCard step={1} title="What are the two experiences being compared?" help="Describe them the way you'd explain to a colleague. Be specific about what's different.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Current experience (control)" hint="What people see today.">
                <input className={inputCls} value={design.control} onChange={(e) => set({ control: e.target.value })} placeholder="e.g. Current six-field signup form" />
              </Field>
              <Field label="New experience (treatment)" hint="The change you want to test.">
                <input className={inputCls} value={design.treatment} onChange={(e) => set({ treatment: e.target.value })} placeholder="e.g. New three-field signup form" />
              </Field>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Tip: test one change at a time. If the new experience changes several unrelated things at once, you won&apos;t know which one caused the result.
            </p>
          </QuestionCard>

          <QuestionCard step={2} title="Who should be in the test?" help="Only include people who will actually see the change — including people who never see it waters down the result.">
            <input className={inputCls} value={design.audience} onChange={(e) => set({ audience: e.target.value, inclusion: `All ${e.target.value || "eligible users"} who actually see the tested experience during the test` })} placeholder="e.g. New visitors to the pricing page" />
            <div className="mt-2 flex flex-wrap gap-2">
              {AUDIENCE_PRESETS.map((a) => (
                <button
                  key={a}
                  onClick={() => set({ audience: a, inclusion: `All ${a.toLowerCase()} who actually see the tested experience during the test` })}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  {a}
                </button>
              ))}
            </div>
          </QuestionCard>

          <QuestionCard step={3} title="What should be randomly assigned?" help="This decides who (or what) gets each version. It's one of the most important choices — pick the scenario that matches your situation.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {UNIT_CHOICES.map((u) => (
                <ChoiceCard
                  key={u.value}
                  selected={design.randomizationUnit === u.value}
                  onClick={() => setUnit(u.value)}
                  title={u.title}
                  desc={u.desc}
                  when={u.when}
                  recommended={u.recommended}
                  warning={u.warning}
                />
              ))}
            </div>
            {design.randomizationUnit === "session" && (
              <div className="mt-3">
                <Banner tone="warning" title="Careful with visit-based assignment">
                  The same person can see both versions on different visits. If your change is something users will notice or remember (a redesign, new
                  pricing, new flow), switch to “Individual people” instead.
                </Banner>
              </div>
            )}
          </QuestionCard>

          <QuestionCard step={4} title="How should traffic be split between the two versions?" help="An even split gets you an answer fastest. Only hold back traffic if the new version is genuinely risky.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {SPLIT_CHOICES.map((s) => (
                <ChoiceCard key={s.value} selected={design.split === s.value} onClick={() => set({ split: s.value })} title={s.title} desc={s.desc} recommended={s.recommended} />
              ))}
            </div>
          </QuestionCard>

          <QuestionCard
            step={5}
            title="How long should the test run?"
            help={
              powerResult && Number.isFinite(powerResult.estimatedWeeks)
                ? `Based on your traffic and sample-size estimate, you need roughly ${powerResult.estimatedWeeks} week(s) of traffic. Always run full weeks so weekdays and weekends are both covered. You can refine this on the Sample Size & Power step.`
                : "Always run full weeks so weekdays and weekends are both covered. The Sample Size & Power step will refine this estimate."
            }
          >
            <div className="flex flex-wrap gap-2">
              {durations.map((w) => (
                <button
                  key={w}
                  onClick={() => set({ durationWeeks: w })}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    design.durationWeeks === w ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                  }`}
                >
                  {w} week{w > 1 ? "s" : ""}
                  {w === recommendedWeeks && <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-600">recommended</span>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Important: once it starts, let it run the full length — stopping early because results “look good” is one of the most common ways teams fool
              themselves.
            </p>
          </QuestionCard>

          <QuestionCard step={6} title="Who should be left out?" help="These groups add noise or bias. The pre-checked defaults are right for almost every test.">
            <div className="space-y-2">
              {EXCLUSION_PRESETS.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                  <input type="checkbox" className="mt-0.5" checked={exclusionChecked(p.text)} onChange={() => toggleExclusion(p.text)} />
                  <span className="text-sm text-slate-700">{p.label}</span>
                </label>
              ))}
            </div>
          </QuestionCard>

          {/* Plain-English summary */}
          <Card className="border-blue-200 bg-blue-50/40">
            <SectionTitle sub="This is what will be recorded in your experiment plan and final report.">Your design, in plain English</SectionTitle>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
              <li>
                <span className="font-medium">Who:</span> {design.audience || "—"}, split {design.split} between the two versions.
              </li>
              <li>
                <span className="font-medium">Comparing:</span> “{design.control || "—"}” (current) vs “{design.treatment || "—"}” (new).
              </li>
              <li>
                <span className="font-medium">Assignment:</span> {unitChoice ? `${unitChoice.title.toLowerCase()} — ${unitChoice.desc.toLowerCase()}` : design.randomizationUnit}
              </li>
              <li>
                <span className="font-medium">Duration:</span> {design.durationWeeks} full week{design.durationWeeks > 1 ? "s" : ""}, with no early stopping just because results look good.
              </li>
              <li>
                <span className="font-medium">Left out:</span> {design.exclusion || "no exclusions"}.
              </li>
              <li>
                <span className="font-medium">Decision rule:</span> ship only if the primary metric improves convincingly and no guardrail metric gets worse.
              </li>
            </ul>
            <div className="mt-4">
              <Expandable title="See the technical details">
                <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                  <KV k="Experiment type" v={design.experimentType} />
                  <KV k="Statistical test" v={design.statisticalTest} />
                  <KV k="Randomization unit" v={design.randomizationUnit} />
                  <KV k="Randomization method" v={design.randomizationMethod} />
                  <KV k="Inclusion criteria" v={design.inclusion} />
                  <KV k="Exclusion criteria" v={design.exclusion} />
                  <KV k="Stopping rules" v={design.stoppingRules} />
                  <KV k="Decision rules" v={design.decisionRules} />
                  <KV k="Rollout recommendation" v={design.rollout} />
                </dl>
              </Expandable>
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <SectionTitle sub="Direct control over every design attribute. These choices are recorded in the final report.">Experiment design</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Control group">
                <input className={inputCls} value={design.control} onChange={(e) => set({ control: e.target.value })} />
              </Field>
              <Field label="Treatment group">
                <input className={inputCls} value={design.treatment} onChange={(e) => set({ treatment: e.target.value })} />
              </Field>
              <Field label="Target audience">
                <input className={inputCls} value={design.audience} onChange={(e) => set({ audience: e.target.value })} />
              </Field>
              <Field label="Randomization unit" hint="User-level prevents one person from seeing both experiences. Account-level suits B2B. Geo/time-block when users can't be split.">
                <select className={inputCls} value={design.randomizationUnit} onChange={(e) => setUnit(e.target.value as Unit)}>
                  {["user", "session", "account", "geo", "time-block", "cluster"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sample split">
                <input className={inputCls} value={design.split} onChange={(e) => set({ split: e.target.value })} />
              </Field>
              <Field label="Planned duration (weeks)">
                <input type="number" min={1} className={inputCls} value={design.durationWeeks} onChange={(e) => set({ durationWeeks: Number(e.target.value) })} />
              </Field>
              <Field label="Inclusion criteria">
                <input className={inputCls} value={design.inclusion} onChange={(e) => set({ inclusion: e.target.value })} />
              </Field>
              <Field label="Exclusion criteria">
                <input className={inputCls} value={design.exclusion} onChange={(e) => set({ exclusion: e.target.value })} />
              </Field>
              <Field label="Randomization method">
                <input className={inputCls} value={design.randomizationMethod} onChange={(e) => set({ randomizationMethod: e.target.value })} />
              </Field>
              <Field label="Statistical test">
                <input className={inputCls} value={design.statisticalTest} onChange={(e) => set({ statisticalTest: e.target.value })} />
              </Field>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              <KV k="Stopping rules" v={design.stoppingRules} />
              <KV k="Decision rules" v={design.decisionRules} />
              <KV k="Rollout recommendation" v={design.rollout} />
            </dl>
          </Card>

          {design.randomizationUnit === "session" && (
            <Banner tone="warning" title="Session-level randomization risk">
              The same user can land in both variants across sessions, contaminating anything the user remembers. Prefer user-level randomization for visible
              UX changes.
            </Banner>
          )}
        </>
      )}

      <Expandable title="Common design mistakes this platform will hold you to">
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not change targeting or the treatment mid-test — restart instead.</li>
          <li>Do not stop early because results look good (peeking inflates false positives).</li>
          <li>Do not ignore guardrail metrics or sample ratio mismatch.</li>
          <li>Do not test multiple unrelated changes in one variant.</li>
          <li>Do not launch during unusual seasonality if avoidable.</li>
          <li>Analyze only users who were actually exposed; no user should appear in both variants.</li>
        </ul>
      </Expandable>

      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={onNext}>Continue →</Button>
      </div>
    </div>
  );
}
