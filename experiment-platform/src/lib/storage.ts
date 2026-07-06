// LocalStorage-backed persistence. Designed so a future backend can replace
// these functions without touching UI code.

import type { AppSettings, Experiment, SavedReport } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const EXPERIMENTS_KEY = "exp-platform:experiments";
const REPORTS_KEY = "exp-platform:reports";
const SETTINGS_KEY = "exp-platform:settings";
const BOOKMARKS_KEY = "exp-platform:bookmarks";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function listExperiments(): Experiment[] {
  return read<Experiment[]>(EXPERIMENTS_KEY, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getExperiment(id: string): Experiment | undefined {
  return listExperiments().find((e) => e.id === id);
}

export function saveExperiment(exp: Experiment) {
  const all = read<Experiment[]>(EXPERIMENTS_KEY, []);
  const idx = all.findIndex((e) => e.id === exp.id);
  exp.updatedAt = new Date().toISOString();
  if (idx >= 0) all[idx] = exp;
  else all.push(exp);
  write(EXPERIMENTS_KEY, all);
}

export function deleteExperiment(id: string) {
  write(
    EXPERIMENTS_KEY,
    read<Experiment[]>(EXPERIMENTS_KEY, []).filter((e) => e.id !== id)
  );
}

export function newExperiment(): Experiment {
  const now = new Date().toISOString();
  return {
    id: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    step: 0,
  };
}

export function listReports(): SavedReport[] {
  return read<SavedReport[]>(REPORTS_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveReport(report: SavedReport) {
  const all = read<SavedReport[]>(REPORTS_KEY, []);
  const idx = all.findIndex((r) => r.id === report.id);
  if (idx >= 0) all[idx] = report;
  else all.push(report);
  write(REPORTS_KEY, all);
}

export function deleteReport(id: string) {
  write(
    REPORTS_KEY,
    read<SavedReport[]>(REPORTS_KEY, []).filter((r) => r.id !== id)
  );
}

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(s: AppSettings) {
  write(SETTINGS_KEY, s);
}

export function getBookmarks(): string[] {
  return read<string[]>(BOOKMARKS_KEY, []);
}

export function toggleBookmark(slug: string): string[] {
  const current = getBookmarks();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
  write(BOOKMARKS_KEY, next);
  return next;
}
