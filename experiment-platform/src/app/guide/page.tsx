"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, SectionTitle, inputCls } from "@/components/ui";
import { CATEGORIES, TEST_CATALOG, type Category, type Difficulty } from "@/data/testCatalog";
import { toggleBookmark } from "@/lib/storage";
import { useBookmarks } from "@/lib/hooks";

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [showComparison, setShowComparison] = useState(false);
  const bookmarks = useBookmarks();
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEST_CATALOG.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (difficulty !== "all" && t.difficulty !== difficulty) return false;
      if (onlyBookmarked && !bookmarks.includes(t.slug)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.plainEnglish.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.useCases.some((u) => u.toLowerCase().includes(q))
      );
    });
  }, [query, category, difficulty, onlyBookmarked, bookmarks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Experimentation Guide</h1>
        <p className="mt-1 text-sm text-slate-500">
          A practical, plain-English catalog of experiment designs and hypothesis tests — when to use each, what data it needs, and where teams go wrong.
        </p>
      </div>

      <Card className="no-print">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input className={inputCls} placeholder="Search tests, use cases, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
            <option value="all">All difficulty levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} />
              Bookmarked
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showComparison} onChange={(e) => setShowComparison(e.target.checked)} />
              Comparison table
            </label>
          </div>
        </div>
      </Card>

      {showComparison ? (
        <Card>
          <SectionTitle sub="A side-by-side view of every method in the catalog.">Test comparison</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Test</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Question it answers</th>
                  <th className="pb-2 pr-4">Metric types</th>
                  <th className="pb-2 pr-4">Difficulty</th>
                  <th className="pb-2">MVP analysis</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.slug} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/guide/${t.slug}`} className="font-medium text-blue-700 hover:underline">{t.name}</Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{t.category}</td>
                    <td className="py-2 pr-4 text-slate-600">{t.questionAnswered}</td>
                    <td className="py-2 pr-4 text-slate-500">{t.metricTypes.join(", ")}</td>
                    <td className="py-2 pr-4"><Badge tone="blue">{t.difficulty}</Badge></td>
                    <td className="py-2">{t.mvpSupported ? <Badge tone="green">Yes</Badge> : <Badge tone="slate">Guide only</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          {CATEGORIES.filter((c) => filtered.some((t) => t.category === c)).map((c) => (
            <section key={c}>
              <SectionTitle>{c}</SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filtered
                  .filter((t) => t.category === c)
                  .map((t) => (
                    <Card key={t.slug} className="relative h-full transition-colors hover:border-blue-300">
                      <button
                        onClick={() => toggleBookmark(t.slug)}
                        title={bookmarks.includes(t.slug) ? "Remove bookmark" : "Bookmark"}
                        className={`absolute right-4 top-4 text-lg leading-none ${bookmarks.includes(t.slug) ? "text-amber-500" : "text-slate-200 hover:text-slate-400"}`}
                      >
                        ★
                      </button>
                      <Link href={`/guide/${t.slug}`} className="block pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                          <Badge tone="blue">{t.difficulty}</Badge>
                          {t.mvpSupported && <Badge tone="green">analyzable</Badge>}
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{t.plainEnglish}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {t.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{tag}</span>
                          ))}
                        </div>
                      </Link>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-500">No tests match the current filters.</p>}
        </>
      )}
    </div>
  );
}
