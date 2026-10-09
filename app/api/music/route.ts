import { NextRequest, NextResponse } from "next/server";
import { buildMusicPrompt, generateTrackAudio } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let body: {
    goals?: string;
    musicStyle?: string;
    neurotype?: string;
    variantHint?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { goals, musicStyle, neurotype, variantHint } = body;
  if (!goals || typeof goals !== "string") {
    return NextResponse.json(
      { error: "'goals' is required and must be a string" },
      { status: 400 }
    );
  }
  if (!musicStyle || typeof musicStyle !== "string") {
    return NextResponse.json(
      { error: "'musicStyle' is required and must be a string" },
      { status: 400 }
    );
  }
  if (!neurotype || typeof neurotype !== "string") {
    return NextResponse.json(
      { error: "'neurotype' is required and must be a string" },
      { status: 400 }
    );
  }

  const prompt = buildMusicPrompt(goals, musicStyle, neurotype, variantHint);

  try {
    const { buffer, contentType } = await generateTrackAudio(prompt);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'inline; filename="song.mp3"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ElevenLabs request failed" },
      { status: 502 }
    );
  }
}
