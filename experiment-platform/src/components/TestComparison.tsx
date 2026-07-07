"use client";

// Side-by-side comparison of the recommended test vs an alternative,
// rendered inline so the user never loses their place in the workflow.

import Link from "next/link";
import type { ReactNode } from "react";
import { getTestBySlug, type TestEntry } from "@/data/testCatalog";
import { Badge, Card, SectionTitle } from "./ui";

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

const ROWS: { label: string; render: (t: TestEntry) => ReactNode }[] = [
  { label: "In plain English", render: (t) => t.plainEnglish },
  { label: "Question it answers", render: (t) => t.questionAnswered },
  { label: "Best for", render: (t) => <List items={t.useCases} /> },
  { label: "Data needed", render: (t) => <List items={t.dataNeeded} /> },
  { label: "Key assumptions", render: (t) => <List items={t.assumptions} /> },
  { label: "Limitations", render: (t) => <List items={t.limitations} /> },
  { label: "When not to use it", render: (t) => <List items={t.whenNotToUse} /> },
  { label: "Difficulty", render: (t) => <Badge tone="blue">{t.difficulty}</Badge> },
  {
    label: "Analysis in this app",
    render: (t) => (t.mvpSupported ? <Badge tone="green">Supported</Badge> : <Badge tone="slate">Guidance only</Badge>),
  },
];

export default function TestComparison({
  recommendedSlug,
  alternativeSlug,
  onClose,
}: {
  recommendedSlug: string;
  alternativeSlug: string;
  onClose: () => void;
}) {
  const a = getTestBySlug(recommendedSlug);
  const b = getTestBySlug(alternativeSlug);
  if (!a || !b) return null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <SectionTitle sub="How the recommended test stacks up against this alternative.">Side-by-side comparison</SectionTitle>
        <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Close comparison">
          ✕ Close
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-36 pb-3 align-bottom" />
              {[a, b].map((t, i) => (
                <th key={t.slug} className="pb-3 pr-4 text-left align-bottom">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                    {i === 0 && <Badge tone="green">Recommended</Badge>}
                  </div>
                  <Link href={`/guide/${t.slug}`} className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline">
                    Read full guide →
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-slate-100 align-top">
                <td className="py-3 pr-3 text-xs font-medium uppercase tracking-wide text-slate-400">{row.label}</td>
                <td className="py-3 pr-4 leading-relaxed text-slate-600">{row.render(a)}</td>
                <td className="py-3 pr-2 leading-relaxed text-slate-600">{row.render(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
