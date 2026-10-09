"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useQuizSession } from "@/lib/session";

export function AppHeader() {
  const { session, update } = useQuizSession();
  const pathname = usePathname();
  const router = useRouter();

  const goToQuiz = useCallback(() => {
    update((prev) => ({ ...prev, phase: "quiz", step: 0, answers: {} }));
    if (pathname !== "/") router.push("/");
  }, [update, pathname, router]);

  const goToPlaylist = useCallback(() => {
    if (!session.tracks) return;
    update((prev) => ({ ...prev, phase: "result" }));
    if (pathname !== "/") router.push("/");
  }, [session.tracks, update, pathname, router]);

  const onPlaylistPage = pathname === "/" && session.phase === "result";
  const onQuizFlow = pathname === "/" && session.phase === "quiz";
  const onUsagePage = pathname === "/usage";

  return (
    <header className="relative z-10 flex flex-wrap items-center gap-3 px-4 pt-4">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-coral text-2xl shadow-coral">
          🎧
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none">Chill-Pill</p>
          <p className="text-xs text-ink-soft">music tuned to how you focus</p>
        </div>
      </div>

      <nav className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={goToQuiz}
          className={`rounded-full px-4 py-2 font-display text-sm font-semibold transition ${
            onQuizFlow ? "bg-ink text-cream" : "bg-cream text-ink shadow-soft hover:-translate-y-0.5"
          }`}
        >
          {session.tracks ? "Retake Quiz" : "Quiz"}
        </button>
        <button
          type="button"
          onClick={goToPlaylist}
          disabled={!session.tracks || (pathname === "/" && session.phase === "generating")}
          className={`rounded-full px-4 py-2 font-display text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
            onPlaylistPage ? "bg-ink text-cream" : "bg-cream text-ink shadow-soft hover:-translate-y-0.5"
          }`}
        >
          Playlist
        </button>
        <Link
          href="/usage"
          className={`rounded-full px-4 py-2 font-display text-sm font-semibold transition ${
            onUsagePage ? "bg-ink text-cream" : "bg-cream text-ink shadow-soft hover:-translate-y-0.5"
          }`}
        >
          Usage
        </Link>
      </nav>
    </header>
  );
}
