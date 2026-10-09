/** Linearly ramps an element's volume over `durationMs`, calling `onDone` once it lands exactly on `to`. */
export function fadeVolume(
  el: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void,
): () => void {
  let cancelled = false;
  const start = performance.now();
  el.volume = from;

  function step(now: number) {
    if (cancelled) return;
    // Clamp both ends: a first-frame rAF timestamp can land a hair before `start`
    // (sub-millisecond scheduling jitter), which without the floor would compute a
    // negative volume and throw IndexSizeError — silently killing the fade forever.
    const t = Math.max(0, Math.min(1, (now - start) / durationMs));
    el.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  }

  requestAnimationFrame(step);
  return () => {
    cancelled = true;
  };
}
