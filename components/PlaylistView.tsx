"use client";

import { useEffect } from "react";
import type { Track } from "@/lib/playlist";
import { playOrToggle, seekTo, syncTracks, toggleLoop, usePlayerState } from "@/lib/playerStore";

type Props = {
  tracks: Track[];
};

const SWATCH_BG: Record<Track["swatch"], string> = {
  sage: "bg-sage",
  sky: "bg-sky",
  butter: "bg-butter",
  lav: "bg-lav",
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Bars({ animate }: { animate: boolean }) {
  return (
    <span className="flex h-4 w-4 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-coral ${animate ? "animate-floaty" : ""}`}
          style={{
            height: animate ? "100%" : "40%",
            animationDuration: `${0.6 + i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

export function PlaylistView({ tracks }: Props) {
  const player = usePlayerState();

  // Keep the store's track list current if the playlist changes (e.g. via chat)
  // while something is playing, so auto-advance-to-next-track stays accurate.
  useEffect(() => {
    syncTracks(tracks);
  }, [tracks]);

  const playAll = () => {
    if (tracks[0]) playOrToggle(tracks[0], tracks);
  };

  return (
    <section className="relative z-10 mx-auto max-w-2xl px-6 pb-16 pt-10">
      <div className="animate-rise rounded-[2.5rem] bg-gradient-to-br from-coral to-lav p-8 text-center shadow-coral sm:p-10">
        <span className="inline-block rounded-full bg-cream/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-cream">
          Your playlist
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-cream sm:text-4xl">Focus Session</h1>
        <p className="mt-2 text-sm text-cream/85">
          {tracks.length} tracks · tuned to how you focus
        </p>
        <button
          type="button"
          onClick={playAll}
          className="mt-6 rounded-full bg-cream px-8 py-3 font-display text-sm font-semibold text-ink shadow-lift transition hover:-translate-y-0.5"
        >
          ▶ Play
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.75rem] bg-cream shadow-lift">
        {tracks.map((track, index) => {
          const isCurrent = player.currentTrackId === track.id;
          const isPlaying = isCurrent && player.playing;
          return (
            <div
              key={track.id}
              className={`px-5 py-4 transition ${isCurrent ? "bg-clay" : "hover:bg-clay/60"} ${
                index !== tracks.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => playOrToggle(track, tracks)}
                className="flex w-full items-center gap-4 text-left"
              >
                <div
                  className={`relative grid size-12 shrink-0 place-items-center rounded-xl text-xl ${SWATCH_BG[track.swatch]}`}
                >
                  {isPlaying ? <Bars animate /> : "🎵"}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex items-center gap-2 truncate font-display text-base font-semibold ${
                      isCurrent ? "text-coral" : "text-ink"
                    }`}
                  >
                    <span className="truncate">{track.title}</span>
                    {track.edited && (
                      <span className="shrink-0 rounded-full bg-lav/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                        Edited
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{track.moodLabel}</p>
                </div>
                <span className="shrink-0 text-lg">{isPlaying ? "❚❚" : "▶"}</span>
              </button>

              {isCurrent && (
                <div className="mt-3 flex items-center gap-2 pl-16">
                  <span className="w-9 shrink-0 text-xs tabular-nums text-ink-soft">
                    {formatTime(player.currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={player.duration || 0}
                    step={0.1}
                    value={Math.min(player.currentTime, player.duration || 0)}
                    onChange={(event) => seekTo(Number(event.target.value))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-clay accent-coral"
                  />
                  <span className="w-9 shrink-0 text-xs tabular-nums text-ink-soft">
                    {formatTime(player.duration)}
                  </span>
                  <button
                    type="button"
                    onClick={toggleLoop}
                    aria-pressed={player.loop}
                    aria-label={player.loop ? "Disable loop" : "Loop this track"}
                    className={`shrink-0 rounded-full px-2 py-1 text-sm transition ${
                      player.loop ? "bg-coral text-cream" : "bg-clay text-ink-soft"
                    }`}
                  >
                    🔁
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
