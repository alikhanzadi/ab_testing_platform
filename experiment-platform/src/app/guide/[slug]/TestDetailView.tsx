"use client";

import Link from "next/link";
import { Badge, Button, Card, Expandable, SectionTitle } from "@/components/ui";
import { getTestBySlug, TEST_CATALOG } from "@/data/testCatalog";

export default function TestDetailView({ slug }: { slug: string }) {
  const test = getTestBySlug(slug);

  if (!test) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Test not found</h1>
        <Link href="/guide" className="text-sm text-blue-600 hover:underline">← Back to the Experimentation Guide</Link>
      </div>
    );
  }

  const related = test.related.map((slug) => TEST_CATALOG.find((t) => t.slug === slug)).filter(Boolean);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/guide" className="text-xs font-medium text-blue-600 hover:underline">← Experimentation Guide</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{test.name}</h1>
          <Badge tone="blue">{test.difficulty}</Badge>
          <Badge tone="slate">{test.category}</Badge>
          {test.mvpSupported && <Badge tone="green">analysis supported</Badge>}
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">{test.plainEnglish}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/new-experiment"><Button>Build this test in the Experiment Builder</Button></Link>
        <Link href="/templates"><Button variant="secondary">Get a CSV template</Button></Link>
      </div>

      <Card>
        <SectionTitle>What question does it answer?</SectionTitle>
        <p className="text-sm text-slate-700">{test.questionAnswered}</p>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Example business use cases</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
            {test.useCases.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      </Card>

      <Card>
        <SectionTitle>Hypothesis structure</SectionTitle>
        <p className="rounded-lg bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700">{test.hypothesisFormat}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Null hypothesis example</p>
            <p className="mt-1 text-sm text-slate-600">{test.nullExample}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Alternative hypothesis example</p>
            <p className="mt-1 text-sm text-slate-600">{test.altExample}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card id="assumptions">
          <SectionTitle>Assumptions</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {test.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Data needed</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {test.dataNeeded.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Metric types: {test.metricTypes.join(", ")}</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>How to run it</SectionTitle>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          {test.howToRun.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">How to interpret results</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{test.howToInterpret}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>Limitations & drawbacks</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {test.limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Common mistakes</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {test.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle>When NOT to use it</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {test.whenNotToUse.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </Card>

      <Card id="example">
        <SectionTitle sub="A complete worked example in a realistic company setting.">Worked example</SectionTitle>
        <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          {[
            ["Business context", test.example.businessContext],
            ["Question", test.example.question],
            ["Hypothesis", test.example.hypothesis],
            ["Control", test.example.control],
            ["Treatment", test.example.treatment],
            ["Primary metric", test.example.metric],
            ["Data needed", test.example.dataNeeded],
            ["Test selected", test.example.testSelected],
            ["Why this test", test.example.whySelected],
            ["Interpretation", test.example.interpretation],
            ["Limitation", test.example.limitation],
            ...(test.example.guardrail ? [["Guardrail", test.example.guardrail]] : []),
          ].map(([k, v]) => (
            <div key={k} className="py-1.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-sm text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Expandable title="Sample CSV schema">
        <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100">{test.csvSchema}</pre>
      </Expandable>

      {related.length > 0 && (
        <Card>
          <SectionTitle>Related tests</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r!.slug} href={`/guide/${r!.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700">
                {r!.name}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
