FROM node:22.17-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# ffmpeg-static's install script downloads a statically linked ffmpeg binary
# for the build platform here, so this step needs outbound network access.
RUN npm ci
COPY . .
# No build-time secrets: both API keys are read per request, not at build.
RUN npm run build

FROM node:22.17-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Docker sets HOSTNAME to the container id, which the standalone server would
# bind to; listen on all interfaces so the published port is reachable.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# standalone/ already contains the traced node_modules, including the
# ffmpeg-static binary (see outputFileTracingIncludes in next.config.ts).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Sample tracks: read from disk by /api/agent when a tweak targets one of them.
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
