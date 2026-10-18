import { CANDIDATES } from "./evaluate-candidates.mjs";

const EVIDENCE_DIRECTIONS = [
  "inconclusive",
  "continue baseline",
  "mutate with live routing",
  "replace"
];

const OBSERVED_RESULTS = new Set(["completed", "attempted", "observed only"]);
const UNREPORTED_VALUES = new Set([
  "",
  "unknown",
  "not recorded",
  "not tested",
  "not tested / unknown",
  "not tested / not recorded"
]);

function counter() {
  return Object.create(null);
}

function increment(map, key) {
  const label = String(key ?? "unknown");
  map[label] = (Object.hasOwn(map, label) ? map[label] : 0) + 1;
}

function coverageLabel(value) {
  const label = String(value ?? "").trim();
  return UNREPORTED_VALUES.has(label.toLowerCase()) ? "unreported" : label;
}

function isObserved(record) {
  return OBSERVED_RESULTS.has(record?.result);
}

function countLine(map, emptyLabel = "none") {
  const entries = Object.entries(map)
    .filter(([, value]) => value > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length
    ? entries.map(([key, value]) => key + ": " + value).join("; ")
    : emptyLabel;
}

export function summarizeEvidence(records = [], candidates = CANDIDATES) {
  const safeRecords = Array.isArray(records) ? records : [];
  const byCandidate = Object.create(null);

  for (const [id, candidate] of Object.entries(candidates)) {
    byCandidate[id] = {
      id,
      label: candidate.label,
      sessions: 0,
      observedSessions: 0,
      completed: 0,
      evidenceDirections: Object.fromEntries(
        EVIDENCE_DIRECTIONS.map(direction => [direction, 0])
      )
    };
  }

  const evidenceDirections = counter();
  for (const direction of EVIDENCE_DIRECTIONS) evidenceDirections[direction] = 0;
  const devices = counter();
  const inputs = counter();
  const results = counter();
  let unknownCandidates = 0;

  for (const record of safeRecords) {
    const id = record?.candidate;
    const candidate = Object.hasOwn(byCandidate, id) ? byCandidate[id] : null;
    const observed = isObserved(record);

    if (candidate) {
      candidate.sessions += 1;
      if (observed) candidate.observedSessions += 1;
      if (record?.result === "completed") candidate.completed += 1;

      const direction = record?.evidenceDirection;
      if (Object.hasOwn(candidate.evidenceDirections, direction)) {
        candidate.evidenceDirections[direction] += 1;
      }
    } else {
      unknownCandidates += 1;
    }

    const direction = record?.evidenceDirection;
    if (Object.hasOwn(evidenceDirections, direction)) {
      evidenceDirections[direction] += 1;
    } else {
      increment(evidenceDirections, direction || "unknown");
    }

    increment(results, record?.result || "unknown");
    increment(devices, coverageLabel(record?.environment?.device));
    increment(inputs, coverageLabel(record?.environment?.input));
  }

  const timedCandidate = byCandidate["double-pass"];
  const stepCandidate = byCandidate["double-pass-step"];
  const timedObserved = timedCandidate?.observedSessions ?? 0;
  const stepObserved = stepCandidate?.observedSessions ?? 0;

  return {
    totalSessions: safeRecords.length,
    byCandidate,
    evidenceDirections,
    results,
    devices,
    inputs,
    unknownCandidates,
    matchedDoublePass: {
      timedSessions: timedObserved,
      stepSessions: stepObserved,
      timedSavedRecords: timedCandidate?.sessions ?? 0,
      stepSavedRecords: stepCandidate?.sessions ?? 0,
      bothCovered: timedObserved > 0 && stepObserved > 0
    }
  };
}

export function evidenceSummaryText(summary) {
  const candidateLines = Object.values(summary.byCandidate)
    .map(candidate =>
      "- " + candidate.label + ": " + candidate.sessions +
      " saved record" + (candidate.sessions === 1 ? "" : "s") +
      " (" + candidate.observedSessions + " observed; " +
      candidate.completed + " completed)"
    );

  return [
    "**Lumen Relay local evidence summary**",
    "",
    "- Saved records: **" + summary.totalSessions + "**",
    "- Matched Double Pass observed coverage: **" +
      summary.matchedDoublePass.timedSessions + " timed / " +
      summary.matchedDoublePass.stepSessions + " step**",
    "- Both matched Double Pass modes observed: **" +
      (summary.matchedDoublePass.bothCovered ? "yes" : "no") + "**",
    ...(summary.unknownCandidates
      ? ["- Records with unknown candidate IDs: **" + summary.unknownCandidates + "**"]
      : []),
    "",
    "**Candidate saved-record coverage**",
    ...candidateLines,
    "",
    "**Evidence directions (session-level, not a company verdict)**",
    "- " + countLine(summary.evidenceDirections),
    "",
    "**Session results**",
    "- " + countLine(summary.results),
    "",
    "**Environment fields**",
    "- Devices: " + countLine(summary.devices),
    "- Inputs: " + countLine(summary.inputs),
    "- `unreported` means the field was unknown/not recorded; it is not tested-device coverage.",
    "",
    "_This summary only counts locally saved observations. It does not score qualitative notes or choose Continue / Mutate / Replace._"
  ].join("\n");
}
