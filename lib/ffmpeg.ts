import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

/** Pipes `input` through ffmpeg with the given filter/output args and returns the encoded result. */
export function runFfmpeg(input: Buffer, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary not found"));
      return;
    }
    const proc = spawn(ffmpegPath, ["-i", "pipe:0", ...args, "pipe:1"]);
    const chunks: Buffer[] = [];
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });

    proc.stdin.on("error", () => {
      /* ffmpeg closing stdin early (e.g. on bad input) throws EPIPE here — the "close"
       * handler above already reports the real failure via ffmpeg's exit code. */
    });
    proc.stdin.write(input);
    proc.stdin.end();
  });
}
