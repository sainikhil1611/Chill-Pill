const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";

export function buildMusicPrompt(
  goals: string,
  musicStyle: string,
  neurotype: string,
  variantHint?: string,
): string {
  const base = `Compose a piece of background music designed to help a ${neurotype} listener stay focused while working on: ${goals}. The music should be in a ${musicStyle} style, with a steady, non-distracting rhythm, minimal abrupt changes, and no lyrics, so it supports sustained concentration rather than pulling attention away from the task.`;
  return variantHint ? `${base} ${variantHint}` : base;
}

export async function generateTrackAudio(prompt: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured on the server");
  }

  const response = await fetch(ELEVENLABS_MUSIC_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs request failed: ${errorText}`);
  }

  const contentType = response.headers.get("Content-Type") ?? "audio/mpeg";
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}
