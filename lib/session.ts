import { useCallback, useSyncExternalStore } from "react";
import type { Answers, Neurotype } from "@/lib/neurotype";
import type { Track } from "@/lib/playlist";

export type Phase = "landing" | "quiz" | "generating" | "result" | "error";

export type Session = {
  phase: Phase;
  step: number;
  answers: Partial<Answers>;
  neurotype: Neurotype | null;
  tracks: Track[] | null;
  errorMessage: string | null;
};

export const EMPTY_SESSION: Session = {
  phase: "landing",
  step: 0,
  answers: {},
  neurotype: null,
  tracks: null,
  errorMessage: null,
};

const SESSION_KEY = "tunemind.session.v2";

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
    /* storage unavailable or quota exceeded (large audio data URL) — keep in-memory only */
  }
}

// Module-level cache so useSyncExternalStore's getSnapshot returns a stable
// reference between renders instead of re-parsing (and reallocating) on every call.
let cachedSession: Session | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Session {
  if (!cachedSession) cachedSession = readStored(SESSION_KEY, EMPTY_SESSION);
  return cachedSession;
}

function getServerSnapshot(): Session {
  return EMPTY_SESSION;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSession(value: Session) {
  cachedSession = value;
  writeStored(SESSION_KEY, value);
  for (const listener of listeners) listener();
}

function subscribeNone() {
  return () => {};
}

export function useQuizSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // True only once the client has taken over from the SSR-rendered EMPTY_SESSION,
  // so a returning user's in-progress quiz doesn't flash the landing screen first.
  const hydrated = useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  );

  const update = useCallback((next: Session | ((prev: Session) => Session)) => {
    const prev = cachedSession ?? EMPTY_SESSION;
    setSession(typeof next === "function" ? next(prev) : next);
  }, []);

  const reset = useCallback(() => {
    setSession(EMPTY_SESSION);
  }, []);

  return { session, update, reset, hydrated };
}
