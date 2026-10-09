import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, FunctionCallingConfigMode, type FunctionDeclaration } from "@google/genai";
import { buildMusicPrompt, generateTrackAudio } from "@/lib/elevenlabs";
import { applyAudioEffects } from "@/lib/audioEffects";
import { resolveTrackBuffer } from "@/lib/trackAudio";

const GEMINI_MODEL = "gemini-3.6-flash";

type TrackInput = {
  id: string;
  title: string;
  moodLabel: string;
  dataUrl: string;
};

type AgentRequestBody = {
  message?: string;
  tracks?: TrackInput[];
  goals?: string;
  musicStyle?: string;
  neurotype?: string;
};

function adjustAudioDeclaration(trackIds: string[]): FunctionDeclaration {
  return {
    name: "adjust_audio",
    description:
      "Apply a direct signal-processing tweak (tempo/speed/BPM, volume/loudness) to an EXISTING track's audio, without regenerating its content. Use this whenever the request is purely about speed or loudness — faster, slower, more/fewer beats per minute, louder, quieter — since it's instant and doesn't need a new recording.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", enum: trackIds, description: "Which track to modify." },
        tempo: {
          type: "number",
          description:
            "Playback speed multiplier. 1.2 = 20% faster / more BPM, 0.8 = 20% slower / fewer BPM. Omit if no tempo change was requested.",
        },
        volume: {
          type: "number",
          description:
            "Loudness multiplier. 1.3 = louder, 0.7 = quieter. Omit if no volume change was requested.",
        },
      },
      required: ["trackId"],
    },
  };
}

function generateTrackDeclaration(trackIds: string[]): FunctionDeclaration {
  return {
    name: "generate_track",
    description:
      "Generate new music via ElevenLabs. Use this when the request needs a content or style change signal processing can't do — different instruments, mood, genre, or adding elements like rain/nature sounds — or when the listener wants a brand new track added to the playlist.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        trackId: {
          type: "string",
          enum: trackIds,
          description:
            "An existing track to replace with newly generated audio. Omit this field entirely if the listener wants a brand NEW track added instead.",
        },
        description: {
          type: "string",
          description:
            "A short, self-contained description of the desired music content/style, used as the generation prompt.",
        },
      },
      required: ["description"],
    },
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  let body: AgentRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, tracks, goals, musicStyle, neurotype } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "'message' is required" }, { status: 400 });
  }
  if (!Array.isArray(tracks)) {
    return NextResponse.json({ error: "'tracks' is required" }, { status: 400 });
  }
  if (!goals || !musicStyle || !neurotype) {
    return NextResponse.json(
      { error: "'goals', 'musicStyle', and 'neurotype' are required" },
      { status: 400 },
    );
  }

  const trackIds = tracks.map((t) => t.id);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const trackSummary = tracks
    .map((t) => `- id "${t.id}": "${t.title}" (currently: ${t.moodLabel})`)
    .join("\n");

  let functionCall: { name?: string; args?: Record<string, unknown> } | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Current playlist tracks:\n${trackSummary}\n\nListener request: "${message}"`,
      config: {
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: ["adjust_audio", "generate_track"],
          },
        },
        tools: [
          { functionDeclarations: [adjustAudioDeclaration(trackIds), generateTrackDeclaration(trackIds)] },
        ],
      },
    });
    functionCall = response.functionCalls?.[0];
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gemini request failed" },
      { status: 502 },
    );
  }

  if (!functionCall?.name) {
    return NextResponse.json(
      { error: "The agent couldn't decide what to do with that request — try rephrasing." },
      { status: 422 },
    );
  }

  try {
    if (functionCall.name === "adjust_audio") {
      const args = functionCall.args ?? {};
      const trackId = String(args.trackId ?? "");
      const track = tracks.find((t) => t.id === trackId);
      if (!track) {
        return NextResponse.json({ error: `Unknown track id "${trackId}"` }, { status: 422 });
      }
      const original = await resolveTrackBuffer(track.dataUrl);
      const processed = await applyAudioEffects(original, {
        tempo: typeof args.tempo === "number" ? args.tempo : undefined,
        volume: typeof args.volume === "number" ? args.volume : undefined,
      });
      return NextResponse.json({
        action: "adjust",
        trackId,
        mimeType: "audio/mpeg",
        audioBase64: processed.toString("base64"),
        replyText: `Done — adjusted "${track.title}" directly (no new recording needed).`,
      });
    }

    if (functionCall.name === "generate_track") {
      const args = functionCall.args ?? {};
      const description = String(args.description ?? message);
      const trackId = args.trackId ? String(args.trackId) : undefined;
      const existing = trackId ? tracks.find((t) => t.id === trackId) : undefined;

      const prompt = buildMusicPrompt(goals, musicStyle, neurotype, description);
      const { buffer, contentType } = await generateTrackAudio(prompt);

      return NextResponse.json({
        action: existing ? "replace" : "new",
        trackId: existing?.id,
        description,
        mimeType: contentType,
        audioBase64: buffer.toString("base64"),
        replyText: existing
          ? `Done — regenerated "${existing.title}" with ElevenLabs.`
          : `Done — generated a new track with ElevenLabs.`,
      });
    }

    return NextResponse.json({ error: `Unknown tool "${functionCall.name}"` }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
