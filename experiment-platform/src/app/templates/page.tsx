"use client";

import { Badge, Button, Card, Expandable, SectionTitle } from "@/components/ui";
import { CSV_TEMPLATES } from "@/data/csvTemplates";
import { download } from "@/lib/report";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          CSV templates for common experiment types. Download the header-only template to fill with your own data, or generate realistic demo data to explore
          the analysis workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CSV_TEMPLATES.map((t) => (
          <Card key={t.id} className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{t.name}</p>
              <Badge tone="blue">{t.id}</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{t.description}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p><span className="font-medium text-slate-600">Required:</span> {t.requiredColumns.join(", ")}</p>
              <p><span className="font-medium text-slate-600">Optional:</span> {t.optionalColumns.join(", ")}</p>
              <p><span className="font-medium text-slate-600">Analysis:</span> {t.analysisMethods.join("; ")}</p>
            </div>
            <div className="mt-3">
              <Expandable title="Example rows">
                <pre className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-100">
                  {[t.header.join(","), ...t.exampleRows.map((r) => r.join(","))].join("\n")}
                </pre>
              </Expandable>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => download(`${t.id}-template.csv`, [t.header.join(","), ...t.exampleRows.map((r) => r.join(","))].join("\n"), "text/csv")}>
                Template CSV
              </Button>
              <Button variant="secondary" onClick={() => download(`${t.id}-demo.csv`, t.generate(), "text/csv")}>
                Demo Data
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
