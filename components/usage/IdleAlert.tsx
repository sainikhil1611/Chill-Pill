"use client";

type Props = {
  idleMinutes: number;
  onImHere: () => void;
  onStopSession: () => void;
};

export function IdleAlert({ idleMinutes, onImHere, onStopSession }: Props) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
      <div className="animate-rise max-w-sm rounded-[2rem] bg-cream p-8 text-center shadow-lift">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-butter text-3xl">
          👋
        </div>
        <h2 className="mt-4 text-2xl">Still with us?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          You&rsquo;ve been idle for about {idleMinutes} minute{idleMinutes === 1 ? "" : "s"}.
          Let us know you&rsquo;re still focused, or stop the session here.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onImHere}
            className="rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-cream shadow-lift"
          >
            I&rsquo;m still here
          </button>
          <button
            type="button"
            onClick={onStopSession}
            className="rounded-full bg-clay px-6 py-3 font-display text-sm font-semibold text-ink shadow-soft"
          >
            Stop the session
          </button>
        </div>
      </div>
    </div>
  );
}
