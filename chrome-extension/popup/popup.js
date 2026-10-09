const elements = {
  toggle: document.querySelector("#tracking-toggle"),
  status: document.querySelector("#status-copy"),
  score: document.querySelector("#focus-score"),
  currentDomain: document.querySelector("#current-domain"),
  productiveTime: document.querySelector("#productive-time"),
  distractingTime: document.querySelector("#distracting-time"),
  neutralTime: document.querySelector("#neutral-time"),
  domainList: document.querySelector("#domain-list"),
  emptyState: document.querySelector("#empty-state"),
  resetButton: document.querySelector("#reset-button")
};

const SETTINGS_STORAGE_KEY = "focuscue.activity.settings.v1";

function formatDuration(milliseconds) {
  const totalMinutes = Math.floor(milliseconds / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
}

function render(snapshot) {
  elements.toggle.checked = snapshot.trackingEnabled;
  elements.status.textContent = snapshot.trackingEnabled
    ? "Watching active domains"
    : "Paused";
  elements.score.textContent = String(snapshot.focusScore);
  elements.currentDomain.textContent =
    snapshot.currentDomain ??
    (snapshot.currentStatus === "idle" ? "Device is idle" : "Waiting for activity");
  elements.productiveTime.textContent = formatDuration(
    snapshot.totals.productiveMs
  );
  elements.distractingTime.textContent = formatDuration(
    snapshot.totals.distractingMs
  );
  elements.neutralTime.textContent = formatDuration(snapshot.totals.neutralMs);

  const domains = snapshot.domains;
  elements.domainList.replaceChildren(
    ...domains.map((domain) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const meta = document.createElement("span");
      name.className = "domain-name";
      name.textContent = domain.domain;
      meta.className = "domain-meta";
      meta.textContent = `${domain.category} - ${formatDuration(domain.durationMs)}`;
      item.append(name, meta);
      return item;
    })
  );
  elements.emptyState.hidden = domains.length > 0;
}

async function refresh() {
  try {
    const response = await sendMessage({ type: "FOCUSCUE_GET_ACTIVITY" });
    if (!response?.ok) {
      throw new Error(response?.error ?? "Unable to read activity.");
    }
    render(response.payload);
  } catch {
    elements.status.textContent = "Monitor unavailable";
  }
}

elements.toggle.addEventListener("change", async () => {
  elements.toggle.disabled = true;
  try {
    const response = await sendMessage({
      type: "FOCUSCUE_SET_TRACKING",
      enabled: elements.toggle.checked
    });
    if (response?.ok) {
      render(response.payload);
    }
  } catch {
    await refresh();
  } finally {
    elements.toggle.disabled = false;
  }
});

elements.resetButton.addEventListener("click", async () => {
  const response = await sendMessage({ type: "FOCUSCUE_RESET_TODAY" });
  if (response?.ok) {
    render(response.payload);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const settings = changes[SETTINGS_STORAGE_KEY]?.newValue;
  if (areaName !== "local" || typeof settings?.trackingEnabled !== "boolean") {
    return;
  }

  elements.toggle.checked = settings.trackingEnabled;
  elements.status.textContent = settings.trackingEnabled
    ? "Watching active domains"
    : "Paused";
});

void refresh();
