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

test("summary keeps every candidate visible and reports matched Double Pass coverage", () => {
  const summary = summarizeEvidence(records);
  assert.equal(summary.totalSessions, 3);
  assert.equal(Object.keys(summary.byCandidate).length, 5);
  assert.equal(summary.byCandidate.baseline.sessions, 0);
  assert.equal(summary.byCandidate["double-pass"].sessions, 1);
  assert.equal(summary.byCandidate["double-pass-step"].sessions, 2);
  assert.equal(summary.byCandidate["double-pass-step"].completed, 1);
  assert.deepEqual(summary.matchedDoublePass, {
    timedSessions: 1,
    stepSessions: 2,
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

test("empty summary is useful and does not pretend evidence exists", () => {
  const summary = summarizeEvidence([]);
  assert.equal(summary.totalSessions, 0);
  assert.equal(summary.matchedDoublePass.bothCovered, false);
  for (const candidate of Object.values(summary.byCandidate)) {
    assert.equal(candidate.sessions, 0);
  }
  const report = evidenceSummaryText(summary);
  assert.match(report, /Saved sessions: \*\*0\*\*/);
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
  assert.equal(summary.devices.unknown, 1);
  assert.match(evidenceSummaryText(summary), /unknown candidate IDs: \*\*1\*\*/);
});
