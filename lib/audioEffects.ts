import { runFfmpeg } from "@/lib/ffmpeg";

export type AudioEffects = {
  /** Playback speed multiplier, e.g. 1.2 = 20% faster, 0.8 = 20% slower. */
  tempo?: number;
  /** Loudness multiplier, e.g. 1.3 = louder, 0.7 = quieter. */
  volume?: number;
};

/** ffmpeg's `atempo` filter only accepts 0.5–2.0 per instance — chain instances to reach further. */
function atempoChain(factor: number): string {
  const clamped = Math.max(0.25, Math.min(4, factor));
  const stages: number[] = [];
  let remaining = clamped;
  while (remaining > 2 || remaining < 0.5) {
    const stage = remaining > 2 ? 2 : 0.5;
    stages.push(stage);
    remaining /= stage;
  }
  stages.push(remaining);
  return stages.map((s) => `atempo=${s.toFixed(3)}`).join(",");
}

/** Applies tempo/volume changes directly to existing audio via ffmpeg — no regeneration needed. */
export async function applyAudioEffects(input: Buffer, effects: AudioEffects): Promise<Buffer> {
  const filters: string[] = [];
  if (effects.tempo && effects.tempo !== 1) filters.push(atempoChain(effects.tempo));
  if (effects.volume && effects.volume !== 1) filters.push(`volume=${effects.volume}`);
  if (filters.length === 0) return input;
  return runFfmpeg(input, ["-filter:a", filters.join(","), "-vn", "-f", "mp3"]);
}
