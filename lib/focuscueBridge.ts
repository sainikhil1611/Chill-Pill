"use client";

export type FocusCueDomainCategory = "productive" | "distracting" | "neutral";

export type FocusCueStatus = "active" | "idle" | "unfocused" | "unsupported" | "stopped";

export type FocusCueDomainRollup = {
  domain: string;
  category: FocusCueDomainCategory;
  durationMs: number;
};

export type FocusCueDayHistory = {
  date: string;
  productiveMs: number;
  distractingMs: number;
  neutralMs: number;
  idleMs: number;
  trackedMs: number;
  focusScore: number;
};

export type FocusCueTotals = {
  productiveMs: number;
  distractingMs: number;
  neutralMs: number;
  idleMs: number;
  trackedMs: number;
};

export type FocusCueSnapshot = {
  version: number;
  date: string;
  updatedAt: string;
  trackingEnabled: boolean;
  currentStatus: FocusCueStatus;
  currentDomain: string | null;
  currentCategory: FocusCueDomainCategory | null;
  focusScore: number;
  totals: FocusCueTotals;
  domains: FocusCueDomainRollup[];
  history: FocusCueDayHistory[];
};

type BridgeResponse =
  | { ok: true; payload: FocusCueSnapshot }
  | { ok: false; error: string };

const WEB_SOURCE = "focuscue-web";
const EXTENSION_SOURCE = "focuscue-extension";

const pending = new Map<string, (response: BridgeResponse) => void>();
const readyListeners = new Set<() => void>();
const updateListeners = new Set<(snapshot: FocusCueSnapshot) => void>();
let listenerAttached = false;

function attachListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data as
      | { source?: string; type?: string; requestId?: string; response?: BridgeResponse; payload?: FocusCueSnapshot }
      | undefined;
    if (!data || data.source !== EXTENSION_SOURCE) return;

    if (data.type === "FOCUSCUE_EXTENSION_READY") {
      readyListeners.forEach((cb) => cb());
      return;
    }
    if (data.type === "FOCUSCUE_ACTIVITY_UPDATED" && data.payload) {
      updateListeners.forEach((cb) => cb(data.payload as FocusCueSnapshot));
      return;
    }
    if (data.type === "FOCUSCUE_ACTIVITY_RESPONSE" && data.requestId && data.response) {
      const resolve = pending.get(data.requestId);
      if (resolve) {
        pending.delete(data.requestId);
        resolve(data.response);
      }
    }
  });
}

export function onExtensionReady(callback: () => void): () => void {
  attachListener();
  readyListeners.add(callback);
  return () => readyListeners.delete(callback);
}

export function onActivityUpdated(callback: (snapshot: FocusCueSnapshot) => void): () => void {
  attachListener();
  updateListeners.add(callback);
  return () => updateListeners.delete(callback);
}

function sendRequest(
  type: "FOCUSCUE_GET_ACTIVITY" | "FOCUSCUE_SET_TRACKING" | "FOCUSCUE_RESET_TODAY",
  extra: Record<string, unknown> = {},
  timeoutMs = 3000,
): Promise<BridgeResponse> {
  attachListener();
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      resolve({ ok: false, error: "The extension didn't respond in time." });
    }, timeoutMs);

    pending.set(requestId, (response) => {
      window.clearTimeout(timer);
      resolve(response);
    });

    window.postMessage({ source: WEB_SOURCE, type, requestId, ...extra }, window.location.origin);
  });
}

export function getActivity(): Promise<BridgeResponse> {
  return sendRequest("FOCUSCUE_GET_ACTIVITY");
}

export function setTracking(enabled: boolean): Promise<BridgeResponse> {
  return sendRequest("FOCUSCUE_SET_TRACKING", { enabled });
}

export function resetToday(): Promise<BridgeResponse> {
  return sendRequest("FOCUSCUE_RESET_TODAY");
}
