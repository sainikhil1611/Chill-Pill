"use client";

import { useState } from "react";
import type { Answers, Neurotype } from "@/lib/neurotype";
import { SWATCH_CYCLE, type Track } from "@/lib/playlist";

type Props = {
  tracks: Track[];
  answers: Partial<Answers>;
  neurotype: Neurotype | null;
  onTracksChange: (tracks: Track[]) => void;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type AgentResponse = {
  action?: "adjust" | "replace" | "new";
  trackId?: string;
  description?: string;
  mimeType?: string;
  audioBase64?: string;
  replyText?: string;
  error?: string;
};

function deriveTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Custom Track";
  const words = trimmed.split(/\s+/).slice(0, 4).join(" ");
  const title = words.charAt(0).toUpperCase() + words.slice(1);
  return title.length > 28 ? `${title.slice(0, 28)}…` : title;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export function PlaylistChat({ tracks, answers, neurotype, onTracksChange }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: 'Tell me what you want changed — e.g. "make Warm-Up faster" or "give Wind Down some rain sounds." I\'ll figure out whether that\'s a quick audio tweak or needs a new recording.',
    },
  ]);

  const addMessage = (role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${role}`, role, text }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy || !neurotype) return;
    setInput("");
    addMessage("user", text);
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          tracks: tracks.map((t) => ({
            id: t.id,
            title: t.title,
            moodLabel: t.moodLabel,
            dataUrl: t.dataUrl,
          })),
          goals: answers.primaryGoal ?? "Focus",
          musicStyle: answers.musicStyle ?? "Lo-Fi",
          neurotype,
        }),
      });
      const data: AgentResponse = await res.json();
      if (!res.ok || !data.audioBase64 || !data.mimeType) {
        throw new Error(data.error ?? "Something went wrong");
      }

      const dataUrl = `data:${data.mimeType};base64,${data.audioBase64}`;

      if (data.action === "adjust" || data.action === "replace") {
        onTracksChange(
          tracks.map((t) =>
            t.id === data.trackId
              ? {
                  ...t,
                  dataUrl,
                  edited: true,
                  moodLabel:
                    data.action === "replace" && data.description
                      ? truncate(data.description, 40)
                      : t.moodLabel,
                }
              : t,
          ),
        );
      } else if (data.action === "new") {
        const newTrack: Track = {
          id: `custom-${Date.now()}`,
          title: deriveTitle(data.description ?? text),
          moodLabel: truncate(data.description ?? text, 40),
          swatch: SWATCH_CYCLE[tracks.length % SWATCH_CYCLE.length],
          dataUrl,
          edited: true,
        };
        onTracksChange([...tracks, newTrack]);
      }

      addMessage("assistant", data.replyText ?? "Done!");
    } catch (error) {
      addMessage(
        "assistant",
        `Sorry, that didn't work: ${error instanceof Error ? error.message : "something went wrong"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-[20rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[1.75rem] bg-cream shadow-lift">
          <div className="flex items-center justify-between bg-ink px-4 py-3">
            <p className="font-display text-sm font-semibold text-cream">Tweak your playlist</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-cream/80 hover:text-cream"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-auto bg-coral text-cream" : "bg-clay text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] rounded-2xl bg-clay px-3 py-2 text-sm text-ink-soft">
                Thinking…
              </div>
            )}
          </div>

          <div className="border-t border-border bg-cream px-3 py-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={busy}
                placeholder="Make Warm-Up faster…"
                className="min-w-0 flex-1 rounded-full bg-clay px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-40"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close playlist chat" : "Open playlist chat"}
        className="grid size-14 place-items-center rounded-full bg-coral text-2xl text-cream shadow-coral transition hover:-translate-y-0.5"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
