import { CANDIDATES } from "./evaluate-candidates.mjs";

const UNKNOWN = "unknown / unreported";
const OBSERVED_RESULTS = new Set(["completed", "attempted", "observed only"]);
const RESULT_VALUES = ["completed", "attempted", "observed only", "not recorded", UNKNOWN];
const EVIDENCE_DIRECTIONS = [
  "inconclusive",
  "continue baseline",
  "mutate with live routing",
  "replace",
  UNKNOWN
];
const DEVICE_VALUES = new Set(["desktop/laptop", "phone", "tablet", "other"]);
const INPUT_VALUES = new Set(["mouse/trackpad", "keyboard", "touch", "mixed", "assistive-tech"]);

function makeCounter(keys = []) {
  const counter = Object.create(null);
  for (const key of keys) counter[key] = 0;
  return counter;
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function normalizeEnum(value, allowed) {
  const label = String(value ?? "").trim();
  return allowed.has(label) ? label : UNKNOWN;
}

function normalizeDirection(value) {
  const label = String(value ?? "").trim();
  return EVIDENCE_DIRECTIONS.includes(label) ? label : UNKNOWN;
}

function normalizeResult(value) {
  const label = String(value ?? "").trim();
  return RESULT_VALUES.includes(label) ? label : UNKNOWN;
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
      evidenceDirections: makeCounter(EVIDENCE_DIRECTIONS)
    };
  }

  const evidenceDirections = makeCounter(EVIDENCE_DIRECTIONS);
  const devices = makeCounter([UNKNOWN]);
  const inputs = makeCounter([UNKNOWN]);
  const results = makeCounter(RESULT_VALUES);
  let unknownCandidates = 0;
  let observedSessions = 0;

  for (const record of safeRecords) {
    const candidateId = String(record?.candidate ?? "");
    const candidate = Object.hasOwn(byCandidate, candidateId)
      ? byCandidate[candidateId]
      : null;
    const result = normalizeResult(record?.result);
    const observed = OBSERVED_RESULTS.has(result);

    increment(results, result);

    if (candidate) {
      candidate.sessions += 1;
      if (observed) candidate.observedSessions += 1;
      if (result === "completed") candidate.completed += 1;
    } else {
      unknownCandidates += 1;
    }

    if (!observed) continue;

    observedSessions += 1;
    const direction = normalizeDirection(record?.evidenceDirection);
    increment(evidenceDirections, direction);
    if (candidate) increment(candidate.evidenceDirections, direction);

    const device = normalizeEnum(record?.environment?.device, DEVICE_VALUES);
    const input = normalizeEnum(record?.environment?.input, INPUT_VALUES);
    increment(devices, device);
    increment(inputs, input);
  }

  const timedDoublePass = byCandidate["double-pass"]?.observedSessions ?? 0;
  const stepDoublePass = byCandidate["double-pass-step"]?.observedSessions ?? 0;

  return {
    totalSessions: safeRecords.length,
    observedSessions,
    neutralSavedSessions: safeRecords.length - observedSessions,
    byCandidate,
    evidenceDirections,
    results,
    devices,
    inputs,
    unknownCandidates,
    matchedDoublePass: {
      timedObservedSessions: timedDoublePass,
      stepObservedSessions: stepDoublePass,
      bothCovered: timedDoublePass > 0 && stepDoublePass > 0
    }
  };
}

export function evidenceSummaryText(summary) {
  const candidateLines = Object.values(summary.byCandidate)
    .map(candidate =>
      "- " + candidate.label + ": " + candidate.sessions +
      " saved, " + candidate.observedSessions +
      " observed (" + candidate.completed + " completed)"
    );

  return [
    "**Lumen Relay local evidence summary**",
    "",
    "- Saved sessions: **" + summary.totalSessions + "**",
    "- Observed / attempted sessions: **" + summary.observedSessions + "**",
    "- Neutral / unrecorded saved sessions: **" + summary.neutralSavedSessions + "**",
    "- Matched Double Pass observed coverage: **" +
      summary.matchedDoublePass.timedObservedSessions + " timed / " +
      summary.matchedDoublePass.stepObservedSessions + " step**",
    "- Both matched Double Pass modes actually observed: **" +
      (summary.matchedDoublePass.bothCovered ? "yes" : "no") + "**",
    ...(summary.unknownCandidates
      ? ["- Records with unknown candidate IDs: **" + summary.unknownCandidates + "**"]
      : []),
    "",
    "**Candidate coverage**",
    ...candidateLines,
    "",
    "**Evidence directions (observed sessions only; not a company verdict)**",
    "- " + countLine(summary.evidenceDirections),
    "",
    "**Saved-session results**",
    "- " + countLine(summary.results),
    "",
    "**Environment coverage (observed sessions only)**",
    "- Devices: " + countLine(summary.devices),
    "- Inputs: " + countLine(summary.inputs),
    "",
    "_This summary only counts locally saved observations. Neutral/unrecorded placeholders do not count as observed coverage, qualitative notes are not scored, and no Continue / Mutate / Replace verdict is chosen._"
  ].join("\n");
}
