"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusCue } from "@/lib/useFocusCue";
import { useUsageSession, type CategoryTotals } from "@/lib/usageSession";
import { TimerPanel } from "@/components/usage/TimerPanel";
import { IdleAlert } from "@/components/usage/IdleAlert";
import { UsageDashboard } from "@/components/usage/UsageDashboard";
import type { FocusCueSnapshot } from "@/lib/focuscueBridge";

const IDLE_ALERT_THRESHOLD_MS = 5 * 60 * 1000;

function totalsFromSnapshot(snapshot: FocusCueSnapshot): CategoryTotals {
  return {
    productiveMs: snapshot.totals.productiveMs,
    distractingMs: snapshot.totals.distractingMs,
    neutralMs: snapshot.totals.neutralMs,
    idleMs: snapshot.totals.idleMs,
  };
}

export default function UsagePage() {
  const { connection, snapshot, toggleTracking, reset, refresh } = useFocusCue();
  const { state: usage, hydrated, start, stop } = useUsageSession();

  const idleSinceRef = useRef<number | null>(null);
  const dismissedIdleSinceRef = useRef<number | null>(null);
  const [idleAlertActive, setIdleAlertActive] = useState(false);
  const [idleElapsedMs, setIdleElapsedMs] = useState(0);

  // All state updates happen inside the interval callback (an event, not the effect
  // body itself) — this is the pattern React's stricter effect rules require for
  // deriving UI state from a value (snapshot.currentStatus) that ticks on its own clock.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!snapshot) return;
      if (snapshot.currentStatus === "idle") {
        if (idleSinceRef.current === null) idleSinceRef.current = Date.now();
        const since = idleSinceRef.current;
        const elapsed = Date.now() - since;
        setIdleElapsedMs(elapsed);
        setIdleAlertActive(
          usage.isRunning &&
            elapsed >= IDLE_ALERT_THRESHOLD_MS &&
            dismissedIdleSinceRef.current !== since,
        );
      } else {
        idleSinceRef.current = null;
        dismissedIdleSinceRef.current = null;
        setIdleElapsedMs(0);
        setIdleAlertActive(false);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [snapshot, usage.isRunning]);

  const handleStart = useCallback(
    (minutes: number | null) => {
      if (!snapshot) return;
      void toggleTracking(true);
      start(minutes, totalsFromSnapshot(snapshot));
    },
    [snapshot, start, toggleTracking],
  );

  const handleStop = useCallback(() => {
    if (!snapshot) return;
    stop(totalsFromSnapshot(snapshot));
    setIdleAlertActive(false);
  }, [snapshot, stop]);

  const dismissIdleAlert = useCallback(() => {
    dismissedIdleSinceRef.current = idleSinceRef.current;
    setIdleAlertActive(false);
  }, []);

  const idleMinutes = Math.max(1, Math.round(idleElapsedMs / 60000));

  return (
    <section className="relative z-10 mx-auto max-w-2xl px-6 pb-16 pt-10">
      <div className="text-center">
        <h1 className="text-3xl leading-tight sm:text-4xl">Usage</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Set a timer, go work elsewhere, and come back to see how it went.
        </p>
      </div>

      {!hydrated || connection === "checking" ? (
        <p className="mt-10 text-center text-ink-soft">Looking for the FocusCue extension…</p>
      ) : connection === "not-found" ? (
        <ExtensionSetupCard onRetry={refresh} />
      ) : (
        <>
          <div className="mt-8">
            <TimerPanel
              snapshot={snapshot}
              usage={usage}
              onStart={handleStart}
              onStop={handleStop}
            />
          </div>
          {snapshot && (
            <UsageDashboard snapshot={snapshot} history={usage.history} onResetToday={reset} />
          )}
        </>
      )}

      {idleAlertActive && (
        <IdleAlert
          idleMinutes={idleMinutes}
          onImHere={dismissIdleAlert}
          onStopSession={() => {
            dismissIdleAlert();
            handleStop();
          }}
        />
      )}
    </section>
  );
}

function ExtensionSetupCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-8 animate-rise rounded-[2rem] bg-cream p-8 shadow-lift">
      <h2 className="text-xl">Connect the FocusCue extension</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Usage tracking runs through the FocusCue Chrome extension — it&rsquo;s what actually
        knows which domain you&rsquo;re on and whether you&rsquo;re idle, which a web page alone
        can&rsquo;t see.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
        <li>
          Open <code className="rounded bg-clay px-1.5 py-0.5 text-xs">chrome://extensions</code>
        </li>
        <li>
          Turn on <strong className="text-ink">Developer mode</strong>
        </li>
        <li>
          Choose <strong className="text-ink">Load unpacked</strong> and select this
          project&rsquo;s <code className="rounded bg-clay px-1.5 py-0.5 text-xs">chrome-extension</code> folder
        </li>
        <li>Come back and check again</li>
      </ol>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-cream shadow-lift"
      >
        ↻ Check again
      </button>
    </div>
  );
}
