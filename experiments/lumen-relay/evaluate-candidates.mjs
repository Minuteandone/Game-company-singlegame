// Stable, explicit list of locally playable variants for the observation recorder.
// Extracted from the recorder so candidate/deep-link behavior can be tested without a DOM.
export const CANDIDATES = Object.freeze({
  baseline: { label: "Baseline", url: "./index.html" },
  "relay-window": { label: "Relay Window", url: "./spikes/live-routing.html" },
  "double-pass": { label: "Double Pass", url: "./spikes/double-pass.html" },
  "relay-step": { label: "Relay Window · Step Mode", url: "./spikes/step-routing.html" },
  "double-pass-step": {
    label: "Double Pass · Step Mode",
    url: "./spikes/step-routing.html?level=double-pass"
  }
});

// Query values are allowlisted IDs only; arbitrary URLs/paths are never accepted.
export function getCandidateFromSearch(search = "") {
  const candidate = new URLSearchParams(search).get("candidate");
  return candidate && Object.hasOwn(CANDIDATES, candidate) ? candidate : null;
}
