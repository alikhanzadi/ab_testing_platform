"use client";

import { useEffect, useState } from "react";
import { Banner, Button, Card, Field, SectionTitle, inputCls } from "@/components/ui";
import { getSettings, saveSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => setSettings(getSettings()), []);

  const set = (patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Defaults applied to new experiments and analyses. Stored locally in this browser.</p>
      </div>

      <Card>
        <SectionTitle>Statistical defaults</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Default confidence level" hint="0.95 = 95%. Higher confidence requires more sample.">
            <select className={inputCls} value={settings.confidenceLevel} onChange={(e) => set({ confidenceLevel: Number(e.target.value) })}>
              <option value={0.9}>90%</option>
              <option value={0.95}>95% (recommended)</option>
              <option value={0.99}>99%</option>
            </select>
          </Field>
          <Field label="Default power" hint="0.80 = 80% chance of detecting a true effect at the MDE.">
            <select className={inputCls} value={settings.power} onChange={(e) => set({ power: Number(e.target.value) })}>
              <option value={0.8}>80% (recommended)</option>
              <option value={0.9}>90%</option>
            </select>
          </Field>
          <Field label="Default traffic split (treatment share)">
            <select className={inputCls} value={settings.trafficSplit} onChange={(e) => set({ trafficSplit: Number(e.target.value) })}>
              <option value={0.5}>50 / 50 (recommended)</option>
              <option value={0.3}>70 / 30</option>
              <option value={0.1}>90 / 10</option>
            </select>
          </Field>
          <Field label="Preferred statistical method">
            <select className={inputCls} value={settings.statMethod} onChange={(e) => set({ statMethod: e.target.value as AppSettings["statMethod"] })}>
              <option value="frequentist">Frequentist (primary) with Bayesian view</option>
              <option value="bayesian">Bayesian emphasis (frequentist still shown)</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle>Reporting</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Default report format">
            <select className={inputCls} value={settings.reportFormat} onChange={(e) => set({ reportFormat: e.target.value as AppSettings["reportFormat"] })}>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="pdf">PDF (via print)</option>
            </select>
          </Field>
          <Field label="Company metric prefix" hint="Optional naming convention, e.g. 'core_' or a team prefix shown in metric suggestions.">
            <input className={inputCls} value={settings.metricPrefix} onChange={(e) => set({ metricPrefix: e.target.value })} placeholder="(none)" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            saveSettings(settings);
            setSaved(true);
          }}
        >
          Save Settings
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            saveSettings(DEFAULT_SETTINGS);
            setSettings(DEFAULT_SETTINGS);
            setSaved(true);
          }}
        >
          Reset to Defaults
        </Button>
      </div>
      {saved && <Banner tone="success">Settings saved.</Banner>}

      <Card>
        <SectionTitle>About this MVP</SectionTitle>
        <p className="text-sm leading-relaxed text-slate-600">
          This is a browser-first MVP: experiments, reports, templates, and settings are stored in local browser storage with no backend. The architecture keeps
          storage behind a small interface so future versions can add accounts, database-backed history, warehouse integrations (Snowflake, BigQuery, Redshift),
          analytics integrations (Amplitude, Mixpanel, Segment), a semantic metric layer, approval workflows, and automated experiment monitoring without
          rewriting the UI.
        </p>
      </Card>
    </div>
  );
}
