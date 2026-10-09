import { useCallback, useSyncExternalStore } from "react";

export type CategoryTotals = {
  productiveMs: number;
  distractingMs: number;
  neutralMs: number;
  idleMs: number;
};

export type CompletedSession = {
  id: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number | null;
  delta: CategoryTotals;
  focusScore: number;
};

export type UsageSessionState = {
  isRunning: boolean;
  plannedMinutes: number | null;
  startedAt: number | null;
  startTotals: CategoryTotals | null;
  history: CompletedSession[];
};

export const EMPTY_USAGE_SESSION: UsageSessionState = {
  isRunning: false,
  plannedMinutes: null,
  startedAt: null,
  startTotals: null,
  history: [],
};

const STORAGE_KEY = "focuscue.usageSession.v1";

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

let cached: UsageSessionState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): UsageSessionState {
  if (!cached) cached = readStored(STORAGE_KEY, EMPTY_USAGE_SESSION);
  return cached;
}

function getServerSnapshot(): UsageSessionState {
  return EMPTY_USAGE_SESSION;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeNone() {
  return () => {};
}

function setState(value: UsageSessionState) {
  cached = value;
  writeStored(STORAGE_KEY, value);
  for (const listener of listeners) listener();
}

export function computeFocusScore(totals: CategoryTotals): number {
  const classified = totals.productiveMs + totals.distractingMs;
  return classified ? Math.round((totals.productiveMs / classified) * 100) : 0;
}

export function diffTotals(end: CategoryTotals, start: CategoryTotals): CategoryTotals {
  return {
    productiveMs: Math.max(0, end.productiveMs - start.productiveMs),
    distractingMs: Math.max(0, end.distractingMs - start.distractingMs),
    neutralMs: Math.max(0, end.neutralMs - start.neutralMs),
    idleMs: Math.max(0, end.idleMs - start.idleMs),
  };
}

export function useUsageSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  );

  const start = useCallback((plannedMinutes: number | null, totals: CategoryTotals) => {
    const prev = cached ?? EMPTY_USAGE_SESSION;
    setState({
      isRunning: true,
      plannedMinutes,
      startedAt: Date.now(),
      startTotals: totals,
      history: prev.history,
    });
  }, []);

  const stop = useCallback((totals: CategoryTotals) => {
    const prev = cached ?? EMPTY_USAGE_SESSION;
    if (!prev.isRunning || !prev.startedAt || !prev.startTotals) return;
    const delta = diffTotals(totals, prev.startTotals);
    const entry: CompletedSession = {
      id: `${prev.startedAt}`,
      startedAt: prev.startedAt,
      endedAt: Date.now(),
      plannedMinutes: prev.plannedMinutes,
      delta,
      focusScore: computeFocusScore(delta),
    };
    setState({
      isRunning: false,
      plannedMinutes: null,
      startedAt: null,
      startTotals: null,
      history: [entry, ...prev.history].slice(0, 20),
    });
  }, []);

  return { state, hydrated, start, stop };
}
