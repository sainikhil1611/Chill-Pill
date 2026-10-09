export type TrackSlot = {
  id: string;
  title: string;
  moodLabel: string;
  variantHint: string;
  swatch: "sage" | "sky" | "butter" | "lav";
};

export const TRACK_SLOTS: TrackSlot[] = [
  {
    id: "warm-up",
    title: "Warm-Up",
    moodLabel: "Gentle start",
    variantHint:
      "This is the opening track of a 4-part focus session — ease in with a softer, lower-intensity arrangement.",
    swatch: "sage",
  },
  {
    id: "deep-focus",
    title: "Deep Focus",
    moodLabel: "Core concentration",
    variantHint:
      "This is the second track of a 4-part focus session — the core deep-work section, steady and fuller than the opener.",
    swatch: "sky",
  },
  {
    id: "sustained-flow",
    title: "Sustained Flow",
    moodLabel: "Locked in",
    variantHint:
      "This is the third track of a 4-part focus session — sustained energy for the long stretch, slightly more driving than the previous track.",
    swatch: "butter",
  },
  {
    id: "wind-down",
    title: "Wind Down",
    moodLabel: "Easing off",
    variantHint:
      "This is the closing track of a 4-part focus session — bring the energy back down to a calmer, softer close.",
    swatch: "lav",
  },
];

export type Track = {
  id: string;
  title: string;
  moodLabel: string;
  swatch: TrackSlot["swatch"];
  dataUrl: string;
  edited?: boolean;
};

export const SWATCH_CYCLE: TrackSlot["swatch"][] = ["sage", "sky", "butter", "lav"];
