import { classifyDomain } from "../shared/domain-rules.js";

const STORAGE_KEYS = {
  state: "focuscue.activity.state.v1",
  settings: "focuscue.activity.settings.v1"
};

const SAMPLE_ALARM = "focuscue.activity.sample";
const MAX_SAMPLE_GAP_MS = 2 * 60 * 1000;
const APP_TAB_PATTERNS = [
  "http://localhost:3000/*",
  "http://127.0.0.1:3000/*"
];

const DEFAULT_SETTINGS = {
  trackingEnabled: false,
  idleThresholdSeconds: 60,
  retentionDays: 14
};

let operationQueue = Promise.resolve();

function enqueue(task) {
  operationQueue = operationQueue.then(task, task);
  return operationQueue;
}

function dateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDay(timestamp) {
  return {
    date: dateKey(timestamp),
    updatedAt: new Date(timestamp).toISOString(),
    productiveMs: 0,
    distractingMs: 0,
    neutralMs: 0,
    idleMs: 0,
    byDomain: {}
  };
}

function createState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    current: null,
    days: {}
  };
}

function normalizeSettings(value) {
  return {
    ...DEFAULT_SETTINGS,
    ...(value && typeof value === "object" ? value : {})
  };
}

function normalizeState(value) {
  if (!value || typeof value !== "object" || value.version !== 1) {
    return createState();
  }

  return {
    ...createState(),
    ...value,
    days: value.days && typeof value.days === "object" ? value.days : {}
  };
}

async function readData() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.state
  ]);

  return {
    settings: normalizeSettings(stored[STORAGE_KEYS.settings]),
    state: normalizeState(stored[STORAGE_KEYS.state])
  };
}

function pruneOldDays(state, retentionDays, now) {
  const oldestAllowed = new Date(now);
  oldestAllowed.setHours(0, 0, 0, 0);
  oldestAllowed.setDate(oldestAllowed.getDate() - retentionDays + 1);

  for (const key of Object.keys(state.days)) {
    const parsed = new Date(`${key}T00:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed < oldestAllowed) {
      delete state.days[key];
    }
  }
}

function nextLocalMidnight(timestamp) {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

function addDuration(state, activity, start, end) {
  let cursor = start;

  while (cursor < end) {
    const segmentEnd = Math.min(end, nextLocalMidnight(cursor));
    const duration = Math.max(0, segmentEnd - cursor);
    const key = dateKey(cursor);
    const day = state.days[key] ?? createDay(cursor);

    if (activity.kind === "idle") {
      day.idleMs += duration;
    }

    if (activity.kind === "domain" && activity.domain && activity.category) {
      const categoryKey = `${activity.category}Ms`;
      day[categoryKey] += duration;

      const domainEntry = day.byDomain[activity.domain] ?? {
        domain: activity.domain,
        category: activity.category,
        durationMs: 0
      };
      domainEntry.durationMs += duration;
      domainEntry.category = activity.category;
      day.byDomain[activity.domain] = domainEntry;
    }

    day.updatedAt = new Date(segmentEnd).toISOString();
    state.days[key] = day;
    cursor = segmentEnd;
  }
}

function domainFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function detectCurrentActivity(settings, now) {
  if (!settings.trackingEnabled) {
    return { kind: "stopped", startedAt: now, lastSampleAt: now };
  }

  const idleState = await chrome.idle.queryState(settings.idleThresholdSeconds);
  if (idleState !== "active") {
    return { kind: "idle", startedAt: now, lastSampleAt: now };
  }

  const focusedWindow = await chrome.windows.getLastFocused();
  if (!focusedWindow.focused) {
    return { kind: "unfocused", startedAt: now, lastSampleAt: now };
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: focusedWindow.id
  });
  const domain = domainFromUrl(activeTab?.url);

  if (!domain) {
    return { kind: "unsupported", startedAt: now, lastSampleAt: now };
  }

  return {
    kind: "domain",
    domain,
    category: classifyDomain(domain),
    startedAt: now,
    lastSampleAt: now
  };
}

function sameActivity(left, right) {
  return (
    left?.kind === right?.kind &&
    left?.domain === right?.domain &&
    left?.category === right?.category
  );
}

async function sampleActivity(timestamp = Date.now()) {
  const { settings, state } = await readData();
  const previous = state.current;

  if (
    settings.trackingEnabled &&
    previous &&
    typeof previous.lastSampleAt === "number"
  ) {
    const elapsed = Math.min(
      Math.max(0, timestamp - previous.lastSampleAt),
      MAX_SAMPLE_GAP_MS
    );
    addDuration(state, previous, timestamp - elapsed, timestamp);
  }

  const detected = await detectCurrentActivity(settings, timestamp);
  if (sameActivity(previous, detected) && previous?.startedAt) {
    detected.startedAt = previous.startedAt;
  }

  state.current = detected;
  state.updatedAt = new Date(timestamp).toISOString();
  pruneOldDays(state, settings.retentionDays, timestamp);

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: settings,
    [STORAGE_KEYS.state]: state
  });

  return buildSnapshot(settings, state, timestamp);
}

function buildSnapshot(settings, state, timestamp = Date.now()) {
  const today = state.days[dateKey(timestamp)] ?? createDay(timestamp);
  const classifiedMs = today.productiveMs + today.distractingMs;
  const focusScore = classifiedMs
    ? Math.round((today.productiveMs / classifiedMs) * 100)
    : 0;
  const domains = Object.values(today.byDomain)
    .sort((left, right) => right.durationMs - left.durationMs);
  const history = Object.values(state.days)
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((day) => {
      const classifiedDayMs = day.productiveMs + day.distractingMs;
      return {
        date: day.date,
        productiveMs: day.productiveMs,
        distractingMs: day.distractingMs,
        neutralMs: day.neutralMs,
        idleMs: day.idleMs,
        trackedMs: day.productiveMs + day.distractingMs + day.neutralMs,
        focusScore: classifiedDayMs
          ? Math.round((day.productiveMs / classifiedDayMs) * 100)
          : 0
      };
    });

  return {
    version: 1,
    date: today.date,
    updatedAt: state.updatedAt,
    trackingEnabled: settings.trackingEnabled,
    currentStatus:
      state.current?.kind === "domain" ? "active" : state.current?.kind ?? "stopped",
    currentDomain:
      state.current?.kind === "domain" ? state.current.domain : null,
    currentCategory:
      state.current?.kind === "domain" ? state.current.category : null,
    focusScore,
    totals: {
      productiveMs: today.productiveMs,
      distractingMs: today.distractingMs,
      neutralMs: today.neutralMs,
      idleMs: today.idleMs,
      trackedMs:
        today.productiveMs + today.distractingMs + today.neutralMs
    },
    domains,
    history
  };
}

async function broadcastSnapshot(snapshot) {
  const tabs = await chrome.tabs.query({ url: APP_TAB_PATTERNS });
  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          type: "FOCUSCUE_ACTIVITY_UPDATED",
          payload: snapshot
        })
      )
  );
}

async function sampleAndBroadcast() {
  const snapshot = await sampleActivity();
  await broadcastSnapshot(snapshot);
  return snapshot;
}

async function setTrackingEnabled(enabled) {
  if (!enabled) {
    await sampleActivity();
  }

  const { settings } = await readData();
  settings.trackingEnabled = enabled;
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  return sampleAndBroadcast();
}

async function resetToday() {
  await sampleActivity();
  const { settings, state } = await readData();
  delete state.days[dateKey(Date.now())];
  if (state.current) {
    state.current.lastSampleAt = Date.now();
  }
  state.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [STORAGE_KEYS.state]: state });
  const snapshot = buildSnapshot(settings, state);
  await broadcastSnapshot(snapshot);
  return snapshot;
}

function isAllowedAppUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === "3000"
    );
  } catch {
    return false;
  }
}

function isTrustedSender(sender) {
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  if (sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`)) {
    return true;
  }

  return isAllowedAppUrl(sender.url ?? sender.tab?.url ?? "");
}

async function handleMessage(message, sender) {
  if (!isTrustedSender(sender) || !message || typeof message.type !== "string") {
    return { ok: false, error: "Unauthorized activity request." };
  }

  if (message.type === "FOCUSCUE_GET_ACTIVITY") {
    return { ok: true, payload: await sampleActivity() };
  }

  if (message.type === "FOCUSCUE_SET_TRACKING") {
    if (typeof message.enabled !== "boolean") {
      return { ok: false, error: "Tracking state must be a boolean." };
    }
    return { ok: true, payload: await setTrackingEnabled(message.enabled) };
  }

  if (message.type === "FOCUSCUE_RESET_TODAY") {
    return { ok: true, payload: await resetToday() };
  }

  return { ok: false, error: "Unknown activity request." };
}

async function initialize() {
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  await chrome.alarms.create(SAMPLE_ALARM, { periodInMinutes: 1 });
  await sampleAndBroadcast();
}

chrome.runtime.onInstalled.addListener(() => {
  void enqueue(initialize);
});

chrome.runtime.onStartup.addListener(() => {
  void enqueue(initialize);
});

chrome.tabs.onActivated.addListener(() => {
  void enqueue(sampleAndBroadcast);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.status === "complete")) {
    void enqueue(sampleAndBroadcast);
  }
});

chrome.tabs.onRemoved.addListener(() => {
  void enqueue(sampleAndBroadcast);
});

chrome.windows.onFocusChanged.addListener(() => {
  void enqueue(sampleAndBroadcast);
});

chrome.idle.onStateChanged.addListener(() => {
  void enqueue(sampleAndBroadcast);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SAMPLE_ALARM) {
    void enqueue(sampleAndBroadcast);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void enqueue(() => handleMessage(message, sender))
    .then(sendResponse)
    .catch((error) => {
      console.error("FocusCue activity request failed", error);
      sendResponse({ ok: false, error: "Activity monitor failed." });
    });
  return true;
});

void enqueue(initialize);
