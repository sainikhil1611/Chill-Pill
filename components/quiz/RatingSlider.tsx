"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
};

export function RatingSlider({ value, onChange, minLabel, maxLabel }: Props) {
  return (
    <div className="w-full max-w-md">
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-clay accent-coral"
      />
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-ink-soft">
        <span>{minLabel}</span>
        <span className="font-display text-lg text-ink">{value}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
