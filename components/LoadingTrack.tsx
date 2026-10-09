type Props = {
  trackCount: number;
};

export function LoadingTrack({ trackCount }: Props) {
  return (
    <section className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 pb-16 pt-24 text-center">
      <div className="grid size-24 animate-floaty place-items-center rounded-full bg-coral text-4xl shadow-coral">
        🎧
      </div>
      <h1 className="mt-8 text-3xl">Composing your playlist</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Tuning {trackCount} tracks to how your mind works right now. This usually takes a moment.
      </p>
    </section>
  );
}
