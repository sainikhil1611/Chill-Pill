const WEB_SOURCE = "focuscue-web";
const EXTENSION_SOURCE = "focuscue-extension";
const ALLOWED_REQUEST_TYPES = new Set([
  "FOCUSCUE_GET_ACTIVITY",
  "FOCUSCUE_SET_TRACKING",
  "FOCUSCUE_RESET_TODAY"
]);

function postToPage(type, payload = {}) {
  window.postMessage(
    {
      source: EXTENSION_SOURCE,
      type,
      ...payload
    },
    window.location.origin
  );
}

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    event.data?.source !== WEB_SOURCE ||
    !ALLOWED_REQUEST_TYPES.has(event.data?.type)
  ) {
    return;
  }

  const request = {
    type: event.data.type
  };

  if (event.data.type === "FOCUSCUE_SET_TRACKING") {
    request.enabled = event.data.enabled === true;
  }

  chrome.runtime.sendMessage(request, (response) => {
    const error = chrome.runtime.lastError;
    postToPage("FOCUSCUE_ACTIVITY_RESPONSE", {
      requestId: event.data.requestId,
      response: error
        ? { ok: false, error: error.message }
        : response ?? { ok: false, error: "No extension response." }
    });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "FOCUSCUE_ACTIVITY_UPDATED") {
    postToPage("FOCUSCUE_ACTIVITY_UPDATED", { payload: message.payload });
  }
});

postToPage("FOCUSCUE_EXTENSION_READY");
