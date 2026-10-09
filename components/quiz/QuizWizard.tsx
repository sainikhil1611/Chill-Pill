"use client";

import type { Question } from "@/lib/neurotype";
import { RatingSlider } from "@/components/quiz/RatingSlider";

type Props = {
  question: Question;
  index: number;
  total: number;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
};

export function QuizWizard({
  question,
  index,
  total,
  value,
  onChange,
  onNext,
  onBack,
  canGoBack,
}: Props) {
  const ratingValue = typeof value === "number" ? value : 5;

  return (
    <section className="relative z-10 mx-auto max-w-2xl px-6 pb-16 pt-10">
      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-10 rounded-full transition-colors ${
              i <= index ? "bg-coral" : "bg-cream"
            }`}
          />
        ))}
      </div>

      <div
        key={question.id}
        className="animate-rise rounded-[2.5rem] bg-cream px-6 py-10 text-center shadow-lift sm:px-10"
      >
        <span className="inline-block rounded-full bg-lav/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-ink">
          Question {index + 1} of {total}
        </span>
        <h1 className="mt-4 text-2xl leading-tight sm:text-3xl">{question.prompt}</h1>
        {question.helper && <p className="mt-2 text-sm text-ink-soft">{question.helper}</p>}

        <div className="mt-8">
          {question.kind === "choice" ? (
            <div className="flex flex-wrap justify-center gap-3">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    onNext();
                  }}
                  className={`rounded-full px-6 py-3 font-display text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 ${
                    value === option ? "bg-ink text-cream" : "bg-clay text-ink"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <RatingSlider
                value={ratingValue}
                onChange={onChange}
                minLabel={question.minLabel}
                maxLabel={question.maxLabel}
              />
              <button
                type="button"
                onClick={() => {
                  onChange(ratingValue);
                  onNext();
                }}
                className="rounded-full bg-ink px-8 py-3 font-display text-sm font-semibold text-cream shadow-lift"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>

      {canGoBack && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
          >
            ← Back
          </button>
        </div>
      )}
    </section>
  );
}
