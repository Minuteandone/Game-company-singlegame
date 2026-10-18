const STORAGE_KEY = "lumen-relay-playtest-records-v1";

const CANDIDATES = Object.freeze({
  baseline: { label: "Baseline", url: "./index.html" },
  "relay-window": { label: "Relay Window", url: "./spikes/live-routing.html" },
  "double-pass": { label: "Double Pass", url: "./spikes/double-pass.html" },
  "relay-step": { label: "Relay Window · Step Mode", url: "./spikes/step-routing.html" },
  "double-pass-step": { label: "Double Pass · Step Mode", url: "./spikes/step-routing.html?level=double-pass" }
});

const FIELD_IDS = [
  "candidate", "device", "input", "viewport", "motion", "result",
  "discoverability", "causal", "movement", "fairness", "accessibility",
  "replay", "notes", "verdict"
];

const byId = id => document.getElementById(id);
const elements = Object.fromEntries(FIELD_IDS.map(id => [id, byId(id)]));
Object.assign(elements, {
  openCandidate: byId("open-candidate"),
  saveSession: byId("save-session"),
  copyCurrent: byId("copy-current"),
  resetForm: byId("reset-form"),
  clearSaved: byId("clear-saved"),
  savedList: byId("saved-list"),
  status: byId("status"),
  manualCopyPanel: byId("manual-copy-panel"),
  manualCopyText: byId("manual-copy-text"),
  selectManualCopy: byId("select-manual-copy")
});

function clean(value) {
  const text = String(value ?? "").trim();
  return text || "not tested / not recorded";
}

function loadRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function clearRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function currentRecord() {
  const candidate = elements.candidate.value;
  return {
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    recordedAt: new Date().toISOString(),
    candidate,
    candidateLabel: CANDIDATES[candidate]?.label ?? candidate,
    environment: {
      device: clean(elements.device.value),
      input: clean(elements.input.value),
      viewport: clean(elements.viewport.value),
      reducedMotion: clean(elements.motion.value)
    },
    result: clean(elements.result.value),
    observations: {
      discoverability: clean(elements.discoverability.value),
      causalUnderstanding: clean(elements.causal.value),
      meaningfulMovement: clean(elements.movement.value),
      fairness: clean(elements.fairness.value),
      accessibility: clean(elements.accessibility.value),
      replayInterest: clean(elements.replay.value),
      other: clean(elements.notes.value)
    },
    evidenceDirection: clean(elements.verdict.value)
  };
}

function reportFor(record) {
  return [
    "**Lumen Relay playtest observation**",
    "",
    `- Candidate: **${record.candidateLabel}**`,
    `- Recorded: ${record.recordedAt}`,
    `- Device class: ${record.environment.device}`,
    `- Primary input: ${record.environment.input}`,
    `- Viewport: ${record.environment.viewport}`,
    `- Reduced motion: ${record.environment.reducedMotion}`,
    `- Session result: ${record.result}`,
    "",
    "**Discoverability**",
    record.observations.discoverability,
    "",
    "**Causal understanding**",
    record.observations.causalUnderstanding,
    "",
    "**Meaningful movement**",
    record.observations.meaningfulMovement,
    "",
    "**Fairness**",
    record.observations.fairness,
    "",
    "**Accessibility / control**",
    record.observations.accessibility,
    "",
    "**Replay interest**",
    record.observations.replayInterest,
    "",
    "**Other observations**",
    record.observations.other,
    "",
    `**Evidence direction:** ${record.evidenceDirection}`,
    "",
    "_This is one observation session, not an automatic Continue / Mutate / Replace company verdict._"
  ].join("\n");
}

async function copyText(text) {
  // A successful copy clears any old manual preview, but a failed copy must
  // preserve the complete report in a visible, selectable control.
  elements.manualCopyPanel.hidden = true;

  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard permissions are browser/device-dependent. Try legacy copy.
  }

  let temporary;
  try {
    temporary = document.createElement("textarea");
    temporary.value = text;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.appendChild(temporary);
    temporary.select();
    if (document.execCommand("copy")) return true;
  } catch {
    // The legacy API may be unsupported or denied.
  } finally {
    temporary?.remove();
  }

  elements.manualCopyText.value = text;
  elements.manualCopyPanel.hidden = false;
  elements.manualCopyText.focus();
  elements.manualCopyText.select();
  return false;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function resetForm() {
  for (const id of ["discoverability", "causal", "movement", "fairness", "accessibility", "replay", "notes"]) {
    elements[id].value = "";
  }
  elements.result.value = "completed";
  elements.verdict.value = "inconclusive";
  setStatus("Observation fields cleared.");
}

function renderRecords() {
  const records = loadRecords();
  elements.savedList.replaceChildren();

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No local playtest sessions saved yet.";
    elements.savedList.appendChild(empty);
    return;
  }

  for (const record of records.slice().reverse()) {
    const item = document.createElement("article");
    item.className = "saved-item";

    const heading = document.createElement("strong");
    heading.textContent = record.candidateLabel;

    const meta = document.createElement("div");
    meta.className = "saved-meta";
    meta.textContent = new Date(record.recordedAt).toLocaleString() + " · " + record.evidenceDirection;

    const actions = document.createElement("div");
    actions.className = "saved-actions";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy Issue #8 report";
    copy.addEventListener("click", async () => {
      const ok = await copyText(reportFor(record));
      setStatus(ok ? "Saved session report copied." : "Automatic copy was blocked; select and copy the saved report shown below.");
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      const saved = saveRecords(loadRecords().filter(entry => entry.id !== record.id));
      if (!saved) {
        setStatus("Local storage is unavailable; the saved session could not be deleted.");
        return;
      }
      renderRecords();
      setStatus("Saved session deleted.");
    });

    actions.append(copy, remove);
    item.append(heading, meta, actions);
    elements.savedList.appendChild(item);
  }
}

elements.openCandidate.addEventListener("click", () => {
  const candidate = CANDIDATES[elements.candidate.value];
  if (!candidate) return;
  window.open(candidate.url, "_blank", "noopener,noreferrer");
  setStatus(candidate.label + " opened in a new tab. Return here to record what happened.");
});

elements.saveSession.addEventListener("click", () => {
  const records = loadRecords();
  records.push(currentRecord());
  if (!saveRecords(records)) {
    setStatus("Local storage is unavailable. Your form is still intact; use Copy current Issue #8 report instead.");
    return;
  }
  renderRecords();
  setStatus("Session saved locally. Nothing was uploaded.");
});

elements.copyCurrent.addEventListener("click", async () => {
  const ok = await copyText(reportFor(currentRecord()));
  setStatus(ok ? "Current Issue #8 report copied." : "Automatic copy was blocked; select and copy the complete report shown below.");
});

elements.selectManualCopy.addEventListener("click", () => {
  elements.manualCopyText.focus();
  elements.manualCopyText.select();
  setStatus("Report text selected. Use your device's Copy action to share it.");
});

elements.resetForm.addEventListener("click", resetForm);

elements.clearSaved.addEventListener("click", () => {
  if (!confirm("Delete all locally saved Lumen Relay playtest sessions in this browser?")) return;
  if (!clearRecords()) {
    setStatus("Local storage is unavailable; saved sessions could not be cleared.");
    return;
  }
  renderRecords();
  setStatus("All local playtest sessions deleted.");
});

renderRecords();
