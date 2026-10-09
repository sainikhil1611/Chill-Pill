# FocusCue Chrome extension

The extension measures how long the active, focused Chrome tab spends on each
domain. It records domain names and durations only—never full URLs, page titles,
page content, form values, or keystrokes.

## Load it locally

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `chrome-extension` folder.
4. Open FocusCue at `http://localhost:3000` and turn on **Background service**
   in Settings.

The popup shows today's score, category totals, and top domains. Data stays in
`chrome.storage.local` and the last 14 daily rollups are retained.

The Background service switch in the website and the tracking switch in the
extension popup share the extension's stored tracking state. Changing either
one updates the other immediately while both are open, and the latest extension
state is restored the next time the website loads.

## Website bridge

`bridge/web-bridge.js` is injected only on these development origins:

- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`

It relays a small allowlist of messages between the web page and the extension.
Before deployment, add the production FocusCue origin to `content_scripts.matches`
in `manifest.json` and to `isAllowedAppUrl` plus `APP_TAB_PATTERNS` in
`background/service-worker.js`.

The current bridge messages are:

- `FOCUSCUE_GET_ACTIVITY`
- `FOCUSCUE_SET_TRACKING`
- `FOCUSCUE_RESET_TODAY`

## Classification

Known work/study services are productive, known entertainment/social services
are distracting, and every other HTTP(S) domain is neutral. Edit
`shared/domain-rules.js` to change those defaults. Subdomains inherit their
parent domain's category.

## Stored snapshot

The web app receives a versioned snapshot with the current status and domain,
today's productive/distracting/neutral/idle durations, a focus score, all domain
rollups for the day, and 14 days of aggregate history. The service worker samples on
tab, URL, window-focus, and idle-state changes, with a one-minute alarm as a
fallback.
