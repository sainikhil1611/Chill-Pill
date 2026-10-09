// Reserved status colors (not part of the app's themed palette by design —
// see the dataviz skill: status colors must stay visually distinct from
// categorical/brand hues so they never impersonate a series).
export const STATUS_COLORS = {
  productive: "#0ca30c",
  distracting: "#d03b3b",
  neutral: "#898781",
  idle: "#c3c2b7",
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

export const STATUS_LABELS: Record<StatusKey, string> = {
  productive: "Productive",
  distracting: "Distracting",
  neutral: "Neutral",
  idle: "Idle",
};

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
