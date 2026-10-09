import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone (server.js + only the traced node_modules) for the Docker image.
  output: "standalone",
  // ffmpeg-static locates its binary via __dirname at require time; bundling it
  // rewrites that path and breaks resolution, so it must run via native require.
  serverExternalPackages: ["ffmpeg-static"],
  // The binary itself is only spawned, never imported, so file tracing can't see it —
  // without this it's missing from the standalone output and tempo/volume edits fail.
  outputFileTracingIncludes: {
    "/api/agent": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
