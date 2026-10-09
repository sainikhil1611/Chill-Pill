"use client";

import { useEffect, useState } from "react";
import type { FocusCueSnapshot, FocusCueStatus } from "@/lib/focuscueBridge";
import type { UsageSessionState } from "@/lib/usageSession";
import { formatClock } from "@/lib/usageFormat";

const PRESETS = [15, 25, 45, 60];

const STATUS_COPY: Record<FocusCueStatus, string> = {
  active: "Active",
  idle: "Idle",
  unfocused: "Window unfocused",
  unsupported: "On a non-http page",
  stopped: "Tracking paused",
};

type Props = {
  snapshot: FocusCueSnapshot | null;
  usage: UsageSessionState;
  onStart: (minutes: number | null) => void;
  onStop: () => void;
};

export function TimerPanel({ snapshot, usage, onStart, onStop }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(25);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!usage.isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [usage.isRunning]);

  useEffect(() => {
    if (!usage.isRunning || !usage.plannedMinutes || !usage.startedAt) return;
    const endsAt = usage.startedAt + usage.plannedMinutes * 60_000;
    if (now >= endsAt) onStop();
  }, [now, usage.isRunning, usage.plannedMinutes, usage.startedAt, onStop]);

  const elapsedMs = usage.startedAt ? Math.max(0, now - usage.startedAt) : 0;
  const remainingMs =
    usage.plannedMinutes && usage.startedAt
      ? Math.max(0, usage.startedAt + usage.plannedMinutes * 60_000 - now)
      : null;

  const status: FocusCueStatus = snapshot?.currentStatus ?? "stopped";

  return (
    <div className="animate-rise rounded-[2.5rem] bg-cream px-6 py-8 shadow-lift sm:px-10">
      {!usage.isRunning ? (
        <>
          <h2 className="text-2xl">Set a focus timer</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pick a duration, hit start, and go do the other work — this page keeps tracking.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setSelectedMinutes(minutes)}
                className={`rounded-full px-5 py-2.5 font-display text-sm font-semibold transition ${
                  selectedMinutes === minutes ? "bg-ink text-cream" : "bg-clay text-ink"
                }`}
              >
                {minutes}m
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedMinutes(null)}
              className={`rounded-full px-5 py-2.5 font-display text-sm font-semibold transition ${
                selectedMinutes === null ? "bg-ink text-cream" : "bg-clay text-ink"
              }`}
            >
              No timer
            </button>
          </div>
          <button
            type="button"
            onClick={() => onStart(selectedMinutes)}
            className="mt-6 rounded-full bg-ink px-8 py-3 font-display text-sm font-semibold text-cream shadow-lift transition hover:-translate-y-0.5"
          >
            ▶ Start focusing
          </button>
        </>
      ) : (
        <>
          <span className="inline-block rounded-full bg-lav/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-ink">
            {STATUS_COPY[status]}
          </span>
          <p className="mt-4 font-display text-5xl font-semibold tabular-nums">
            {remainingMs !== null ? formatClock(remainingMs) : formatClock(elapsedMs)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {remainingMs !== null ? "remaining" : "elapsed — no timer set"}
          </p>
          <button
            type="button"
            onClick={onStop}
            className="mt-6 rounded-full bg-clay px-8 py-3 font-display text-sm font-semibold text-ink shadow-soft"
          >
            ■ Stop session
          </button>
        </>
      )}
    </div>
  );
}
