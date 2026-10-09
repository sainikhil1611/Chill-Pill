"use client";

import { useEffect, useRef } from "react";
import { advanceToNext, getPlayerState, registerAudioElement, reportProgress } from "@/lib/playerStore";
import { fadeVolume } from "@/lib/audioFade";

const IDLE_THRESHOLD_MS = 60_000;
const FADE_MS = 1800;
const ATTENTION_TRACK_SRC = "/tracks/attention.mp3";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;

/** Mounted once in the root layout so playback survives client-side route changes
 * (this component never unmounts on navigation, unlike page-level components). */
export function GlobalAudioPlayer() {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const attentionAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    registerAudioElement(mainAudioRef.current);
    return () => registerAudioElement(null);
  }, []);

  useEffect(() => {
    const el = mainAudioRef.current;
    if (!el) return;
    const onProgress = () => reportProgress(el.currentTime, el.duration || 0);
    const onEnded = () => advanceToNext();
    el.addEventListener("timeupdate", onProgress);
    el.addEventListener("loadedmetadata", onProgress);
    el.addEventListener("durationchange", onProgress);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onProgress);
      el.removeEventListener("loadedmetadata", onProgress);
      el.removeEventListener("durationchange", onProgress);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  // Idle -> attention-track crossfade. Everything here reads the player store
  // imperatively (getPlayerState()) rather than through a React-rendered value,
  // since a same-tick pause click must be seen immediately, not after next render.
  useEffect(() => {
    const lastActivity = { current: Date.now() };
    const inAttentionMode = { current: false };
    let cancelMainFade: (() => void) | null = null;
    let cancelAttentionFade: (() => void) | null = null;

    const enterAttentionMode = () => {
      const main = mainAudioRef.current;
      const attention = attentionAudioRef.current;
      if (!main || !attention || inAttentionMode.current) return;
      inAttentionMode.current = true;

      cancelMainFade?.();
      cancelAttentionFade?.();

      attention.currentTime = 0;
      attention.volume = 0;
      void attention.play().catch(() => {});
      cancelAttentionFade = fadeVolume(attention, 0, 1, FADE_MS);
      cancelMainFade = fadeVolume(main, main.volume, 0, FADE_MS, () => {
        main.pause();
      });
    };

    const exitAttentionMode = () => {
      const main = mainAudioRef.current;
      const attention = attentionAudioRef.current;
      if (!main || !attention || !inAttentionMode.current) return;
      inAttentionMode.current = false;

      cancelMainFade?.();
      cancelAttentionFade?.();

      // Only resume the main track if it's still supposed to be playing right now —
      // the user may have paused it themselves while away.
      if (getPlayerState().playing) {
        void main.play().catch(() => {});
        cancelMainFade = fadeVolume(main, main.volume, 1, FADE_MS);
      }
      cancelAttentionFade = fadeVolume(attention, attention.volume, 0, FADE_MS, () => {
        attention.pause();
        attention.currentTime = 0;
      });
    };

    const onActivity = () => {
      lastActivity.current = Date.now();
      if (inAttentionMode.current) exitAttentionMode();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const idleCheck = window.setInterval(() => {
      if (
        getPlayerState().playing &&
        !inAttentionMode.current &&
        Date.now() - lastActivity.current >= IDLE_THRESHOLD_MS
      ) {
        enterAttentionMode();
      }
    }, 2000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(idleCheck);
      cancelMainFade?.();
      cancelAttentionFade?.();
    };
  }, []);

  return (
    <>
      <audio ref={mainAudioRef} className="hidden" />
      <audio ref={attentionAudioRef} src={ATTENTION_TRACK_SRC} loop className="hidden" />
    </>
  );
}
