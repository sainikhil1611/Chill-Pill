# Chill-Pill

A Next.js 16 (App Router, React 19, TypeScript, Tailwind v4) app that builds a
focus soundtrack around how you actually concentrate. An eight-question quiz
classifies you into one of three profiles (Sensory Sensitivity, Balanced Focus,
Under-Aroused Mind), then the server asks the ElevenLabs Music API for a one-
to four-track playlist shaped by your goal, preferred style, and profile. A chat
box on the playlist lets you ask for changes in plain language: a Gemini
function-calling agent decides whether the request is a quick signal-processing
edit (tempo or volume, done instantly with a bundled ffmpeg) or needs a freshly
generated track. A companion Chrome extension, FocusCue, tracks time per domain
and feeds the `/usage` page: a focus timer, a focus score, and an idle alert.

The companion extension keeps its own name, **FocusCue**.

## Quick start (devcontainer — recommended)

1. Prereqs: [Docker](https://docs.docker.com/get-docker/), [VS Code](https://code.visualstudio.com/) + the "Dev Containers" extension.
2. Open this folder in VS Code → "Reopen in Container" when prompted.
3. `cp .env.example .env` and fill in values (see table below) — optional for development, see the note under the table.
4. Run: `npm run dev` → open http://localhost:3000

## Manual setup (no devcontainer)

Tested on Node 22 (the container images) and Node 24.

```bash
npm ci
cp .env.example .env   # optional in development
npm run dev            # http://localhost:3000
```

Other commands: `npm run build` (production build, `output: standalone`),
`npm start` (serve a production build), `npm run lint`.

### Chrome extension (optional, for the `/usage` page)

The extension is loaded straight from this checkout; it is not part of the
web app's build or Docker image.

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select the `chrome-extension/` folder.
3. Open the app at `http://localhost:3000/usage`.

It records domain names and durations only, kept in `chrome.storage.local` for
14 days. See [chrome-extension/README.md](chrome-extension/README.md) for the
message bridge and the domain classification rules.

## Environment variables

| Variable | Required | Purpose | Where to get it |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | Production: yes. Development: no. | Generates playlist tracks (`POST /api/music`, `lib/elevenlabs.ts`) and any track the chat agent regenerates. | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys), on a plan with Music API access. |
| `GEMINI_API_KEY` | Only for the playlist chat | Routes each chat request to an ffmpeg edit or a regeneration (`POST /api/agent`). | [Google AI Studio](https://aistudio.google.com/app/apikey) |

Both keys are server-side runtime variables, read on each request. Nothing is
baked into the build, so the same image runs with any keys you pass it.

A missing key never crashes the app. The affected route answers with a clear
JSON error (`{"error":"ELEVENLABS_API_KEY is not configured on the server"}`),
which the UI shows on its error screen or in the chat.

In development (`npm run dev`) the quiz serves the sample tracks in
`public/tracks/` instead of calling ElevenLabs, so the whole quiz-to-playlist
flow works with no keys. A production build always generates real tracks: one
ElevenLabs request per track, at most two in flight at once.

## Testing

There is no automated test suite (no test runner, no `test` script). This pass
verified:

* `npm ci`, `npm run lint`, and `npm run build` all complete cleanly, on the
  host and inside the devcontainer.
* `docker build -t chill-pill .` succeeds, and the running container serves
  `/` and `/usage` (200) and `/tracks/warm-up.mp3` (200, `audio/mpeg`).
* With no keys set, `POST /api/music` and `POST /api/agent` each return a 500
  with the "not configured on the server" message above, not a stack trace.
* The bundled ffmpeg binary runs inside the image as the unprivileged `node`
  user: a sample track piped through `atempo=1.2` comes back as valid MP3.
* `resolveTrackBuffer` (`lib/trackAudio.ts`) reads `/tracks/attention.mp3` and
  rejects `/../package.json` and `/../../../../etc/hosts`.

## Deployment

Build the production image: `docker build -t chill-pill .`
Run it: `docker run --env-file .env -p 3000:3000 chill-pill`
This container runs on any host (Fly.io, Render, a VPS with Docker) — see
[DEPLOYMENT.md](../DEPLOYMENT.md) in the Projects root for the full walkthrough.

Three things are specific to this project:

* **The build needs network access.** `npm ci` runs `ffmpeg-static`'s install
  script, which downloads the ffmpeg binary for the build platform.
* **Set the keys as runtime secrets** (`fly secrets set`, Render's Environment
  tab, a VPS `.env`), not as build args.
* **The extension only talks to `localhost:3000`.** To use `/usage` against a
  deployed URL, add that origin in three places and reload the extension:
  `content_scripts.matches` in `chrome-extension/manifest.json`, and both
  `APP_TAB_PATTERNS` and `isAllowedAppUrl` in
  `chrome-extension/background/service-worker.js`. Running the container
  locally on port 3000 needs no change.

## Known limitations

* **Not verified with real keys.** Track generation through ElevenLabs and the
  Gemini chat agent were not exercised end to end; only the build, startup,
  missing-key, and ffmpeg checks above were run. The Gemini model id is
  hardcoded as `gemini-3.6-flash` in `app/api/agent/route.ts` and was not
  checked against a live key.
* **The API routes are open.** `/api/music` and `/api/agent` have no
  authentication and no rate limiting, so anyone who can reach a public
  deployment can spend your ElevenLabs and Gemini quota. Put the app behind
  auth or a rate-limiting proxy before exposing it.
* **Chat requests are large.** Each chat message posts every track in the
  playlist as a base64 data URL, several megabytes in production. A host or
  proxy with a small request-body limit will reject it.
* **Playlists live in the browser.** The session, audio included, is kept in
  `localStorage`. When a playlist exceeds the storage quota it stays in memory
  only and is gone on reload; there is no server-side storage and no accounts.
* **The extension is unpacked and Chrome-only.** It is not published to the
  Chrome Web Store, and `/usage` shows a setup card until it is installed.
