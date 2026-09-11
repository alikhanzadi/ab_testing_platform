"use client";

import { useSyncExternalStore } from "react";
import {
  bookmarksSnapshot,
  experimentsSnapshot,
  reportsSnapshot,
  settingsSnapshot,
  subscribe,
} from "./storage";
import { DEFAULT_SETTINGS, type AppSettings, type Experiment, type SavedReport } from "./types";

// localStorage does not exist while a page is prerendered, and the first client
// render has to produce the same markup as that prerender. Each hook therefore
// reports empty data through hydration and React re-renders with the stored
// values immediately after — that is what a server snapshot is for. The empty
// values are shared constants so the snapshot reference stays stable.

const NO_EXPERIMENTS: Experiment[] = [];
const NO_REPORTS: SavedReport[] = [];
const NO_BOOKMARKS: string[] = [];

const noExperiments = () => NO_EXPERIMENTS;
const noReports = () => NO_REPORTS;
const noBookmarks = () => NO_BOOKMARKS;
const defaultSettings = () => DEFAULT_SETTINGS;

/** Experiments saved in this browser, newest first. */
export function useExperiments(): Experiment[] {
  return useSyncExternalStore(subscribe, experimentsSnapshot, noExperiments);
}

/** Reports saved in this browser, newest first. */
export function useReports(): SavedReport[] {
  return useSyncExternalStore(subscribe, reportsSnapshot, noReports);
}

/** Bookmarked catalog slugs. */
export function useBookmarks(): string[] {
  return useSyncExternalStore(subscribe, bookmarksSnapshot, noBookmarks);
}

/** Saved settings, falling back to the defaults. */
export function useStoredSettings(): AppSettings {
  return useSyncExternalStore(subscribe, settingsSnapshot, defaultSettings);
}

const neverChanges = () => () => {};
const afterHydration = () => true;
const duringHydration = () => false;

/**
 * False while prerendering and during hydration, true once mounted. Lets a
 * component that can only render meaningfully with localStorage available hold
 * off until the markup has been hydrated.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, afterHydration, duringHydration);
}
