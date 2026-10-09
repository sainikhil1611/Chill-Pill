"use client";

import { useSyncExternalStore } from "react";
import type { Track } from "@/lib/playlist";

export type PlayerState = {
  tracks: Track[];
  currentTrackId: string | null;
  playing: boolean;
  loop: boolean;
  currentTime: number;
  duration: number;
};

const EMPTY_STATE: PlayerState = {
  tracks: [],
  currentTrackId: null,
  playing: false,
  loop: false,
  currentTime: 0,
  duration: 0,
};

let state: PlayerState = EMPTY_STATE;
const listeners = new Set<() => void>();
let audioEl: HTMLAudioElement | null = null;

function patch(partial: Partial<PlayerState>) {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

/** Called once by the persistent GlobalAudioPlayer so every other component can
 * command the same real <audio> element without owning it. */
export function registerAudioElement(el: HTMLAudioElement | null) {
  audioEl = el;
}

export function playTrack(track: Track, tracks: Track[]) {
  if (!audioEl) return;
  const isSameTrack = state.currentTrackId === track.id;
  if (!isSameTrack) {
    audioEl.src = track.dataUrl;
    audioEl.loop = state.loop;
    patch({ tracks, currentTrackId: track.id, playing: true, currentTime: 0, duration: 0 });
  } else {
    patch({ tracks, playing: true });
  }
  void audioEl.play().catch(() => {});
}

/** Toggles play/pause if `track` is already current, otherwise switches to it. */
export function playOrToggle(track: Track, tracks: Track[]) {
  if (state.currentTrackId === track.id && state.playing) {
    pausePlayback();
  } else {
    playTrack(track, tracks);
  }
}

export function pausePlayback() {
  if (!audioEl) return;
  audioEl.pause();
  patch({ playing: false });
}

export function toggleLoop() {
  if (!audioEl) return;
  audioEl.loop = !state.loop;
  patch({ loop: audioEl.loop });
}

export function seekTo(seconds: number) {
  if (!audioEl) return;
  audioEl.currentTime = seconds;
  patch({ currentTime: seconds });
}

export function reportProgress(currentTime: number, duration: number) {
  patch({ currentTime, duration });
}

/** Keeps the store's track list current when the playlist changes underneath
 * an in-progress playback (e.g. the chat edits a track) — used only for
 * auto-advance-to-next-track, not for the currently playing audio itself. */
export function syncTracks(tracks: Track[]) {
  patch({ tracks });
}

export function advanceToNext() {
  const index = state.tracks.findIndex((t) => t.id === state.currentTrackId);
  const next = state.tracks[index + 1];
  if (next) {
    playTrack(next, state.tracks);
  } else {
    patch({ playing: false });
  }
}

function getSnapshot(): PlayerState {
  return state;
}

/** Imperative, non-reactive read of the live state — for code (like the idle/attention
 * crossfade) that needs the current value at the moment it runs, not a React-render-timed one. */
export function getPlayerState(): PlayerState {
  return state;
}

function getServerSnapshot(): PlayerState {
  return EMPTY_STATE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlayerState(): PlayerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
