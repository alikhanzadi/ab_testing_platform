"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { listExperiments, listReports } from "@/lib/storage";
import type { Experiment, SavedReport } from "@/lib/types";
import { TEST_CATALOG } from "@/data/testCatalog";

const STATUS_TONE: Record<Experiment["status"], "slate" | "blue" | "amber" | "green"> = {
  draft: "slate",
  designed: "blue",
  analyzed: "amber",
  reported: "green",
};

export default function Dashboard() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    setExperiments(listExperiments());
    setReports(listReports());
  }, []);

  const drafts = experiments.filter((e) => e.status === "draft" || e.status === "designed");
  const commonTests = TEST_CATALOG.filter((t) => ["ab-test", "abn-test", "revenue-per-user-test", "retention-cohort-test"].includes(t.slug));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Design, analyze, and report experiments with guided rigor.</p>
        </div>
        <Link href="/new-experiment">
          <Button>Start a New Experiment</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Experiments</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{experiments.length}</p>
          <p className="mt-1 text-xs text-slate-500">{drafts.length} in progress</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Completed Reports</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{reports.length}</p>
          <p className="mt-1 text-xs text-slate-500">stored locally</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Test Catalog</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{TEST_CATALOG.length}</p>
          <p className="mt-1 text-xs text-slate-500">
            methods in the{" "}
            <Link href="/guide" className="text-blue-600 hover:underline">
              Experimentation Guide
            </Link>
          </p>
        </Card>
      </div>

      <section>
        <SectionTitle sub="Pick up where you left off, or review completed work.">Recent experiments</SectionTitle>
        {experiments.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-slate-500">No experiments yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Start with the{" "}
              <Link href="/new-experiment" className="font-medium text-blue-600 hover:underline">
                guided workflow
              </Link>
              , or jump straight to{" "}
              <Link href="/analyze" className="font-medium text-blue-600 hover:underline">
                CSV analysis
              </Link>{" "}
              if you already have results.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {experiments.slice(0, 6).map((e) => (
              <Link key={e.id} href={`/new-experiment?id=${e.id}`} className="block">
                <Card className="flex items-center justify-between transition-colors hover:border-blue-300">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{e.question?.refined ?? "Untitled experiment"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Updated {new Date(e.updatedAt).toLocaleDateString()} · Step {e.step + 1} of 12
                      {e.recommendation ? ` · ${e.recommendation.testName}` : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle sub="The most commonly used experiment types. Explore all of them in the Guide.">Common test types</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {commonTests.map((t) => (
            <Link key={t.slug} href={`/guide/${t.slug}`}>
              <Card className="h-full transition-colors hover:border-blue-300">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <Badge tone="blue">{t.difficulty}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{t.plainEnglish}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
