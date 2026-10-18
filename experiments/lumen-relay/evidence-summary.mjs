import { CANDIDATES } from "./evaluate-candidates.mjs";

const EVIDENCE_DIRECTIONS = [
  "inconclusive",
  "continue baseline",
  "mutate with live routing",
  "replace"
];

function increment(map, key) {
  const label = String(key ?? "unknown");
  map[label] = (map[label] ?? 0) + 1;
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
  const byCandidate = Object.fromEntries(
    Object.entries(candidates).map(([id, candidate]) => [
      id,
      {
        id,
        label: candidate.label,
        sessions: 0,
        completed: 0,
        evidenceDirections: Object.fromEntries(EVIDENCE_DIRECTIONS.map(direction => [direction, 0]))
      }
    ])
  );

  const evidenceDirections = Object.fromEntries(EVIDENCE_DIRECTIONS.map(direction => [direction, 0]));
  const devices = {};
  const inputs = {};
  const results = {};
  let unknownCandidates = 0;

  for (const record of safeRecords) {
    const candidate = byCandidate[record?.candidate];
    if (candidate) {
      candidate.sessions += 1;
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
    increment(devices, record?.environment?.device || "unknown");
    increment(inputs, record?.environment?.input || "unknown");
  }

  const timedDoublePass = byCandidate["double-pass"]?.sessions ?? 0;
  const stepDoublePass = byCandidate["double-pass-step"]?.sessions ?? 0;

  return {
    totalSessions: safeRecords.length,
    byCandidate,
    evidenceDirections,
    results,
    devices,
    inputs,
    unknownCandidates,
    matchedDoublePass: {
      timedSessions: timedDoublePass,
      stepSessions: stepDoublePass,
      bothCovered: timedDoublePass > 0 && stepDoublePass > 0
    }
  };
}

export function evidenceSummaryText(summary) {
  const candidateLines = Object.values(summary.byCandidate)
    .map(candidate =>
      "- " + candidate.label + ": " + candidate.sessions +
      " session" + (candidate.sessions === 1 ? "" : "s") +
      " (" + candidate.completed + " completed)"
    );

  return [
    "**Lumen Relay local evidence summary**",
    "",
    "- Saved sessions: **" + summary.totalSessions + "**",
    "- Matched Double Pass coverage: **" +
      summary.matchedDoublePass.timedSessions + " timed / " +
      summary.matchedDoublePass.stepSessions + " step**",
    "- Both matched Double Pass modes observed: **" +
      (summary.matchedDoublePass.bothCovered ? "yes" : "no") + "**",
    ...(summary.unknownCandidates
      ? ["- Records with unknown candidate IDs: **" + summary.unknownCandidates + "**"]
      : []),
    "",
    "**Candidate coverage**",
    ...candidateLines,
    "",
    "**Evidence directions (session-level, not a company verdict)**",
    "- " + countLine(summary.evidenceDirections),
    "",
    "**Session results**",
    "- " + countLine(summary.results),
    "",
    "**Environment coverage**",
    "- Devices: " + countLine(summary.devices),
    "- Inputs: " + countLine(summary.inputs),
    "",
    "_This summary only counts locally saved observations. It does not score qualitative notes or choose Continue / Mutate / Replace._"
  ].join("\n");
}
