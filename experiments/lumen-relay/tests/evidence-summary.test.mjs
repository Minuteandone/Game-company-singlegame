import test from "node:test";
import assert from "node:assert/strict";
import { summarizeEvidence, evidenceSummaryText } from "../evidence-summary.mjs";

const UNKNOWN = "unknown / unreported";

const records = [
  {
    candidate: "double-pass",
    result: "completed",
    evidenceDirection: "mutate with live routing",
    environment: { device: "desktop/laptop", input: "mouse/trackpad" }
  },
  {
    candidate: "double-pass-step",
    result: "completed",
    evidenceDirection: "inconclusive",
    environment: { device: "desktop/laptop", input: "keyboard" }
  },
  {
    candidate: "double-pass-step",
    result: "attempted",
    evidenceDirection: "continue baseline",
    environment: { device: "phone", input: "touch" }
  }
];

test("summary separates saved records from observed matched Double Pass coverage", () => {
  const summary = summarizeEvidence(records);
  assert.equal(summary.totalSessions, 3);
  assert.equal(summary.observedSessions, 3);
  assert.equal(summary.neutralSavedSessions, 0);
  assert.equal(Object.keys(summary.byCandidate).length, 5);
  assert.equal(summary.byCandidate.baseline.sessions, 0);
  assert.equal(summary.byCandidate["double-pass"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass"].observedSessions, 1);
  assert.equal(summary.byCandidate["double-pass-step"].sessions, 2);
  assert.equal(summary.byCandidate["double-pass-step"].observedSessions, 2);
  assert.equal(summary.byCandidate["double-pass-step"].completed, 1);
  assert.deepEqual(summary.matchedDoublePass, {
    timedObservedSessions: 1,
    stepObservedSessions: 2,
    bothCovered: true
  });
});

test("summary counts observed evidence directions and environments without choosing a verdict", () => {
  const summary = summarizeEvidence(records);
  assert.equal(summary.evidenceDirections["mutate with live routing"], 1);
  assert.equal(summary.evidenceDirections["continue baseline"], 1);
  assert.equal(summary.evidenceDirections.inconclusive, 1);
  assert.equal(summary.results.completed, 2);
  assert.equal(summary.results.attempted, 1);
  assert.equal(summary.devices["desktop/laptop"], 2);
  assert.equal(summary.devices.phone, 1);
  assert.equal(summary.inputs.touch, 1);

  const report = evidenceSummaryText(summary);
  assert.match(report, /Observed \/ attempted sessions: \*\*3\*\*/);
  assert.match(report, /1 timed \/ 2 step/);
  assert.match(report, /Both matched Double Pass modes actually observed: \*\*yes\*\*/);
  assert.match(report, /observed sessions only; not a company verdict/i);
  assert.match(report, /no Continue \/ Mutate \/ Replace verdict is chosen/i);
  assert.doesNotMatch(report, /recommended|winner|best candidate/i);
});

test("neutral saved records do not become fake observed coverage", () => {
  const summary = summarizeEvidence([{
    candidate: "double-pass",
    result: "not recorded",
    evidenceDirection: "inconclusive",
    environment: { device: "not recorded", input: "not recorded" }
  }]);

  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.observedSessions, 0);
  assert.equal(summary.neutralSavedSessions, 1);
  assert.equal(summary.byCandidate["double-pass"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass"].observedSessions, 0);
  assert.equal(summary.results["not recorded"], 1);
  assert.equal(summary.evidenceDirections.inconclusive, 0);
  assert.equal(summary.devices[UNKNOWN], 0);
  assert.equal(summary.inputs[UNKNOWN], 0);
  assert.deepEqual(summary.matchedDoublePass, {
    timedObservedSessions: 0,
    stepObservedSessions: 0,
    bothCovered: false
  });

  const report = evidenceSummaryText(summary);
  assert.match(report, /Saved sessions: \*\*1\*\*/);
  assert.match(report, /Observed \/ attempted sessions: \*\*0\*\*/);
  assert.match(report, /Neutral \/ unrecorded saved sessions: \*\*1\*\*/);
  assert.match(report, /0 timed \/ 0 step/);
  assert.match(report, /actually observed: \*\*no\*\*/);
});

test("empty summary is useful and does not pretend evidence exists", () => {
  const summary = summarizeEvidence([]);
  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.observedSessions, 0);
  assert.equal(summary.neutralSavedSessions, 0);
  assert.equal(summary.matchedDoublePass.bothCovered, false);
  for (const candidate of Object.values(summary.byCandidate)) {
    assert.equal(candidate.sessions, 0);
    assert.equal(candidate.observedSessions, 0);
  }
  const report = evidenceSummaryText(summary);
  assert.match(report, /Saved sessions: \*\*0\*\*/);
  assert.match(report, /0 timed \/ 0 step/);
});

test("inherited object keys and unknown enum labels cannot poison summary counters", () => {
  const prototypeSessionsBefore = ({}).sessions;
  const summary = summarizeEvidence([{
    candidate: "__proto__",
    result: "completed",
    evidenceDirection: "inconclusive",
    environment: { device: "constructor", input: "toString" }
  }]);

  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.observedSessions, 1);
  assert.equal(summary.unknownCandidates, 1);
  assert.equal(summary.evidenceDirections.inconclusive, 1);
  assert.equal(summary.devices[UNKNOWN], 1);
  assert.equal(summary.inputs[UNKNOWN], 1);
  assert.equal(({}).sessions, prototypeSessionsBefore);
  assert.equal(Object.prototype.sessions, undefined);
  assert.match(evidenceSummaryText(summary), /unknown candidate IDs: \*\*1\*\*/);
});

test("unknown legacy values are bucketed rather than becoming arbitrary counter keys", () => {
  const summary = summarizeEvidence([{
    candidate: "old-prototype",
    result: "observed only",
    evidenceDirection: "legacy-direction",
    environment: { device: "mystery-console", input: "brainwave" }
  }]);

  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.observedSessions, 1);
  assert.equal(summary.unknownCandidates, 1);
  assert.equal(summary.evidenceDirections[UNKNOWN], 1);
  assert.equal(summary.evidenceDirections["legacy-direction"], undefined);
  assert.equal(summary.results["observed only"], 1);
  assert.equal(summary.devices[UNKNOWN], 1);
  assert.equal(summary.inputs[UNKNOWN], 1);
});
