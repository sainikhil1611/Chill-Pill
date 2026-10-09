"use client";

import type { FocusCueSnapshot } from "@/lib/focuscueBridge";
import type { CompletedSession } from "@/lib/usageSession";
import { STATUS_COLORS, STATUS_LABELS, formatDuration, type StatusKey } from "@/lib/usageFormat";

type Props = {
  snapshot: FocusCueSnapshot;
  history: CompletedSession[];
  onResetToday: () => void;
};

const STATUS_KEYS: StatusKey[] = ["productive", "distracting", "neutral", "idle"];

function totalsFor(snapshot: FocusCueSnapshot): Record<StatusKey, number> {
  return {
    productive: snapshot.totals.productiveMs,
    distracting: snapshot.totals.distractingMs,
    neutral: snapshot.totals.neutralMs,
    idle: snapshot.totals.idleMs,
  };
}

function StackedBar({ totals }: { totals: Record<StatusKey, number> }) {
  const sum = STATUS_KEYS.reduce((acc, key) => acc + totals[key], 0);
  return (
    <div className="flex h-4 gap-[2px] overflow-hidden rounded-full bg-clay">
      {STATUS_KEYS.map((key) =>
        totals[key] > 0 ? (
          <div
            key={key}
            style={{
              width: `${(totals[key] / (sum || 1)) * 100}%`,
              backgroundColor: STATUS_COLORS[key],
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
            title={`${STATUS_LABELS[key]}: ${formatDuration(totals[key])}`}
          />
        ) : null,
      )}
    </div>
  );
}

function Legend({ totals }: { totals: Record<StatusKey, number> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATUS_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[key] }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">{STATUS_LABELS[key]}</p>
            <p className="font-display text-sm font-semibold">{formatDuration(totals[key])}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageDashboard({ snapshot, history, onResetToday }: Props) {
  const totals = totalsFor(snapshot);

  return (
    <div className="mt-6 space-y-6">
      <div className="animate-rise rounded-[1.75rem] bg-cream p-6 shadow-lift">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-soft">
              Today&rsquo;s focus score
            </p>
            <p className="font-display text-4xl font-semibold">{snapshot.focusScore}%</p>
          </div>
          <button
            type="button"
            onClick={onResetToday}
            className="rounded-full bg-clay px-4 py-2 font-display text-xs font-semibold text-ink shadow-soft"
          >
            ↻ Reset today
          </button>
        </div>
        <div className="mt-5">
          <StackedBar totals={totals} />
          <Legend totals={totals} />
        </div>
      </div>

      {snapshot.domains.length > 0 && (
        <div className="animate-rise rounded-[1.75rem] bg-cream p-6 shadow-lift">
          <h3 className="font-display text-lg font-semibold">Top domains today</h3>
          <ul className="mt-3 divide-y divide-border">
            {snapshot.domains.slice(0, 8).map((d) => (
              <li key={d.domain} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        d.category === "productive"
                          ? STATUS_COLORS.productive
                          : d.category === "distracting"
                            ? STATUS_COLORS.distracting
                            : STATUS_COLORS.neutral,
                    }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-semibold">{d.domain}</span>
                </span>
                <span className="shrink-0 text-ink-soft">{formatDuration(d.durationMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="animate-rise rounded-[1.75rem] bg-cream p-6 shadow-lift">
        <h3 className="font-display text-lg font-semibold">Session history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No completed sessions yet — start a timer above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {history.map((session) => {
              const sessionTotals: Record<StatusKey, number> = {
                productive: session.delta.productiveMs,
                distracting: session.delta.distractingMs,
                neutral: session.delta.neutralMs,
                idle: session.delta.idleMs,
              };
              return (
                <li key={session.id} className="py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      {new Date(session.startedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-ink-soft">
                      {formatDuration(session.endedAt - session.startedAt)} · focus{" "}
                      {session.focusScore}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <StackedBar totals={sessionTotals} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
