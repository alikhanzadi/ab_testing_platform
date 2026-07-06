"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import type { ParsedDataset } from "@/lib/types";
import { Button } from "./ui";
import { CSV_TEMPLATES } from "@/data/csvTemplates";

export default function CsvUploader({ onParsed }: { onParsed: (ds: ParsedDataset) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parseFile = (file: File) => {
    setBusy(true);
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setBusy(false);
        if (!res.meta.fields || res.meta.fields.length < 2) {
          setError("Could not read a header row. The first row must contain column names.");
          return;
        }
        if (res.data.length === 0) {
          setError("The file has no data rows.");
          return;
        }
        onParsed({
          fileName: file.name,
          columns: res.meta.fields,
          rows: res.data,
          rowCount: res.data.length,
        });
      },
      error: (err) => {
        setBusy(false);
        setError(`Parse error: ${err.message}`);
      },
    });
  };

  const loadDemo = (id: string) => {
    const tpl = CSV_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const csv = tpl.generate();
    const res = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    onParsed({
      fileName: `${tpl.id}-demo.csv`,
      columns: res.meta.fields ?? [],
      rows: res.data,
      rowCount: res.data.length,
    });
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) parseFile(file);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"
        }`}
      >
        <p className="text-sm font-medium text-slate-700">{busy ? "Parsing…" : "Drop a CSV file here"}</p>
        <p className="mt-1 text-xs text-slate-400">
          Required columns: user_id (or unit_id), variant, and an outcome metric (conversion, revenue, or primary_metric)
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose File
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) parseFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>No data handy? Load demo data:</span>
        {["landing-page", "email-subject", "revenue-per-user", "pricing-page", "onboarding-flow"].map((id) => (
          <button key={id} onClick={() => loadDemo(id)} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700">
            {CSV_TEMPLATES.find((t) => t.id === id)?.name}
          </button>
        ))}
      </div>
    </div>
  );
}
