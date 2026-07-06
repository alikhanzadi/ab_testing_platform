"use client";

import { useEffect, useState } from "react";
import { Banner, Button, Card, SectionTitle } from "@/components/ui";
import { deleteReport, listReports } from "@/lib/storage";
import { download, markdownToHtml } from "@/lib/report";
import type { SavedReport } from "@/lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setReports(listReports());
  }, []);

  const open = reports.find((r) => r.id === openId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Generated experiment reports, stored locally in this browser.</p>
      </div>

      {reports.length === 0 && (
        <Banner tone="info">No reports yet. Complete the guided workflow or save a quick analysis to create one.</Banner>
      )}

      <div className="space-y-2">
        {reports.map((r) => (
          <Card key={r.id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? "Close" : "View"}</Button>
              <Button variant="secondary" onClick={() => download(`${r.title.slice(0, 40).replace(/\W+/g, "-")}.md`, r.markdown, "text/markdown")}>MD</Button>
              <Button variant="secondary" onClick={() => download(`${r.title.slice(0, 40).replace(/\W+/g, "-")}.html`, markdownToHtml(r.markdown), "text/html")}>HTML</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(markdownToHtml(r.markdown));
                    w.document.close();
                    w.print();
                  }
                }}
              >
                PDF
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteReport(r.id);
                  setReports(listReports());
                  if (openId === r.id) setOpenId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <Card>
          <SectionTitle>{open.title}</SectionTitle>
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(open.markdown).replace(/^[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*$/, "") }} className="report-body" />
        </Card>
      )}
    </div>
  );
}
