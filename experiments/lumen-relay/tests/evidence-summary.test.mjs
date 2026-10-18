import test from "node:test";
import assert from "node:assert/strict";
import { summarizeEvidence, evidenceSummaryText } from "../evidence-summary.mjs";

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

test("summary keeps every candidate visible and reports observed matched Double Pass coverage", () => {
  const summary = summarizeEvidence(records);
  assert.equal(summary.totalSessions, 3);
  assert.equal(Object.keys(summary.byCandidate).length, 5);
  assert.equal(summary.byCandidate.baseline.sessions, 0);
  assert.equal(summary.byCandidate.baseline.observedSessions, 0);
  assert.equal(summary.byCandidate["double-pass"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass"].observedSessions, 1);
  assert.equal(summary.byCandidate["double-pass-step"].sessions, 2);
  assert.equal(summary.byCandidate["double-pass-step"].observedSessions, 2);
  assert.equal(summary.byCandidate["double-pass-step"].completed, 1);
  assert.deepEqual(summary.matchedDoublePass, {
    timedSessions: 1,
    stepSessions: 2,
    timedSavedRecords: 1,
    stepSavedRecords: 2,
    bothCovered: true
  });
});

test("summary counts evidence directions, results, devices and inputs without choosing a verdict", () => {
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
  assert.match(report, /1 timed \/ 2 step/);
  assert.match(report, /Both matched Double Pass modes observed: \*\*yes\*\*/);
  assert.match(report, /session-level, not a company verdict/i);
  assert.match(report, /does not score qualitative notes or choose Continue \/ Mutate \/ Replace/i);
  assert.doesNotMatch(report, /recommended|winner|best candidate/i);
});

test("neutral saved records remain saved records but do not become observed coverage", () => {
  const summary = summarizeEvidence([
    {
      candidate: "double-pass",
      result: "not recorded",
      evidenceDirection: "inconclusive",
      environment: { device: "not recorded", input: "not recorded" }
    },
    {
      candidate: "double-pass-step",
      result: "not recorded",
      evidenceDirection: "inconclusive",
      environment: { device: "unknown", input: "not tested" }
    }
  ]);

  assert.equal(summary.totalSessions, 2);
  assert.equal(summary.byCandidate["double-pass"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass-step"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass"].observedSessions, 0);
  assert.equal(summary.byCandidate["double-pass-step"].observedSessions, 0);
  assert.equal(summary.matchedDoublePass.timedSessions, 0);
  assert.equal(summary.matchedDoublePass.stepSessions, 0);
  assert.equal(summary.matchedDoublePass.timedSavedRecords, 1);
  assert.equal(summary.matchedDoublePass.stepSavedRecords, 1);
  assert.equal(summary.matchedDoublePass.bothCovered, false);
  assert.equal(summary.devices.unreported, 2);
  assert.equal(summary.inputs.unreported, 2);

  const report = evidenceSummaryText(summary);
  assert.match(report, /Matched Double Pass observed coverage: \*\*0 timed \/ 0 step\*\*/);
  assert.match(report, /unreported.*not tested-device coverage/i);
});

test("empty summary is useful and does not pretend evidence exists", () => {
  const summary = summarizeEvidence([]);
  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.matchedDoublePass.bothCovered, false);
  for (const candidate of Object.values(summary.byCandidate)) {
    assert.equal(candidate.sessions, 0);
    assert.equal(candidate.observedSessions, 0);
  }
  const report = evidenceSummaryText(summary);
  assert.match(report, /Saved records: \*\*0\*\*/);
  assert.match(report, /0 timed \/ 0 step/);
});

test("unknown legacy candidate IDs are retained in totals and flagged", () => {
  const summary = summarizeEvidence([{
    candidate: "old-prototype",
    result: "observed only",
    evidenceDirection: "legacy-direction",
    environment: {}
  }]);
  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.unknownCandidates, 1);
  assert.equal(summary.evidenceDirections["legacy-direction"], 1);
  assert.equal(summary.results["observed only"], 1);
  assert.equal(summary.devices.unreported, 1);
  assert.match(evidenceSummaryText(summary), /unknown candidate IDs: \*\*1\*\*/);
});

test("reserved object-property names are treated as data, never prototypes", () => {
  const beforeSessions = ({}).sessions;
  const summary = summarizeEvidence([{
    candidate: "__proto__",
    result: "completed",
    evidenceDirection: "constructor",
    environment: { device: "constructor", input: "toString" }
  }]);

  assert.equal(summary.totalSessions, 1);
  assert.equal(summary.unknownCandidates, 1);
  assert.equal(summary.evidenceDirections.constructor, 1);
  assert.equal(summary.devices.constructor, 1);
  assert.equal(summary.inputs.toString, 1);
  assert.equal(({}).sessions, beforeSessions);
  assert.equal(Object.hasOwn(summary.byCandidate, "__proto__"), false);
});
