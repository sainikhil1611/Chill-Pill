"use client";

import { useCallback, useEffect } from "react";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { LoadingTrack } from "@/components/LoadingTrack";
import { PlaylistView } from "@/components/PlaylistView";
import { PlaylistChat } from "@/components/PlaylistChat";
import { QUESTIONS, classifyNeurotype, type Answers, type AnswerKey } from "@/lib/neurotype";
import { TRACK_SLOTS, type Track } from "@/lib/playlist";
import { useQuizSession } from "@/lib/session";
import { mapWithConcurrency } from "@/lib/concurrency";
import { requestTrackBlob, blobToDataUrl } from "@/lib/musicClient";

// The connected ElevenLabs plan caps concurrent requests at 2 (a higher-tier plan
// may allow more, but this stays safely under the observed limit either way).
const MUSIC_API_CONCURRENCY = 2;

// In development, serve the 4 tracks already generated into public/tracks/
// instead of calling ElevenLabs again on every retake — keeps iteration free
// while building the UI. Production always generates a real playlist.
const USE_LOCAL_TRACKS = process.env.NODE_ENV !== "production";

export default function Home() {
  const { session, update, reset, hydrated } = useQuizSession();

  const handleChange = useCallback(
    (key: AnswerKey, value: string | number) => {
      update((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
    },
    [update],
  );

  const handleNext = useCallback(() => {
    update((prev) => {
      const isLast = prev.step === QUESTIONS.length - 1;
      if (!isLast) return { ...prev, step: prev.step + 1 };
      const neurotype = classifyNeurotype(prev.answers as Answers);
      return { ...prev, phase: "generating", neurotype, errorMessage: null };
    });
  }, [update]);

  const handleBack = useCallback(() => {
    update((prev) => ({ ...prev, step: Math.max(0, prev.step - 1) }));
  }, [update]);

  const handleBegin = useCallback(() => {
    update((prev) => ({ ...prev, phase: "quiz", step: 0, answers: {} }));
  }, [update]);

  const handleRetry = useCallback(() => {
    update((prev) => ({ ...prev, phase: "generating", errorMessage: null }));
  }, [update]);

  const setTracks = useCallback(
    (tracks: Track[]) => {
      update((prev) => ({ ...prev, tracks }));
    },
    [update],
  );

  useEffect(() => {
    if (session.phase !== "generating" || !session.neurotype) return;
    let cancelled = false;
    const answers = session.answers as Answers;
    const neurotype = session.neurotype;

    const slots = TRACK_SLOTS.slice(0, Number(answers.songCount) || TRACK_SLOTS.length);

    (async () => {
      try {
        if (USE_LOCAL_TRACKS) {
          const tracks: Track[] = slots.map((slot) => ({
            id: slot.id,
            title: slot.title,
            moodLabel: slot.moodLabel,
            swatch: slot.swatch,
            dataUrl: `/tracks/${slot.id}.mp3`,
          }));
          if (cancelled) return;
          update((prev) => ({ ...prev, phase: "result", tracks, errorMessage: null }));
          return;
        }

        const tracks = await mapWithConcurrency(
          slots,
          MUSIC_API_CONCURRENCY,
          async (slot): Promise<Track> => {
            const blob = await requestTrackBlob({
              goals: answers.primaryGoal,
              musicStyle: answers.musicStyle,
              neurotype,
              variantHint: slot.variantHint,
            });
            const dataUrl = await blobToDataUrl(blob);
            return {
              id: slot.id,
              title: slot.title,
              moodLabel: slot.moodLabel,
              swatch: slot.swatch,
              dataUrl,
            };
          },
        );
        if (cancelled) return;
        update((prev) => ({ ...prev, phase: "result", tracks, errorMessage: null }));
      } catch (error) {
        if (cancelled) return;
        update((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: error instanceof Error ? error.message : "Something went wrong",
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the phase transitions into "generating" — answers/neurotype are
    // already fixed by then, and update() is a stable identity from useQuizSession.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase]);

  const currentQuestion = QUESTIONS[session.step];

  return (
    <>
      {!hydrated ? (
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 text-center text-ink-soft">
          Getting things ready…
        </div>
      ) : session.phase === "landing" ? (
        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-16 pt-20 text-center">
          <h1 className="text-4xl leading-tight sm:text-5xl">
            A soundtrack built for your brain, not just your mood
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-ink-soft">
            Answer a few quick questions and we&rsquo;ll generate a track tuned to how you
            actually focus — not a generic playlist.
          </p>
          <button
            type="button"
            onClick={handleBegin}
            className="mt-8 rounded-full bg-ink px-8 py-4 font-display text-lg font-semibold text-cream shadow-lift transition hover:-translate-y-0.5"
          >
            Begin
          </button>
        </section>
      ) : session.phase === "quiz" ? (
        <QuizWizard
          question={currentQuestion}
          index={session.step}
          total={QUESTIONS.length}
          value={session.answers[currentQuestion.id]}
          onChange={(value) => handleChange(currentQuestion.id, value)}
          onNext={handleNext}
          onBack={handleBack}
          canGoBack={session.step > 0}
        />
      ) : session.phase === "generating" ? (
        <LoadingTrack
          trackCount={Number(session.answers.songCount) || TRACK_SLOTS.length}
        />
      ) : session.phase === "error" ? (
        <section className="relative z-10 mx-auto max-w-md px-6 pb-16 pt-20 text-center">
          <div className="rounded-[2rem] bg-cream px-6 py-10 shadow-lift">
            <h1 className="text-2xl">Couldn&rsquo;t generate your track</h1>
            <p className="mt-3 text-ink-soft">{session.errorMessage}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-cream shadow-lift"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-clay px-6 py-3 font-display text-sm font-semibold text-ink shadow-soft"
              >
                Retake quiz
              </button>
            </div>
          </div>
        </section>
      ) : session.phase === "result" && session.tracks ? (
        <>
          <PlaylistView tracks={session.tracks} />
          <PlaylistChat
            tracks={session.tracks}
            answers={session.answers}
            neurotype={session.neurotype}
            onTracksChange={setTracks}
          />
        </>
      ) : null}
    </>
  );
}
