import { readFile } from "node:fs/promises";
import path from "node:path";

/** Resolves a track's audio to a Buffer, whether it's a data: URL or a /public-relative path. */
export async function resolveTrackBuffer(dataUrl: string): Promise<Buffer> {
  if (dataUrl.startsWith("data:")) {
    const base64 = dataUrl.split(",")[1] ?? "";
    return Buffer.from(base64, "base64");
  }
  if (dataUrl.startsWith("/")) {
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, dataUrl);
    // dataUrl comes straight from the request body — keep "/../.." from escaping public/.
    if (!filePath.startsWith(publicDir + path.sep)) {
      throw new Error("Unsupported track audio reference");
    }
    return readFile(filePath);
  }
  throw new Error("Unsupported track audio reference");
}
