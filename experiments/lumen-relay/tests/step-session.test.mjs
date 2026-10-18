import test from "node:test";
import assert from "node:assert/strict";
import { createStepSession } from "../spikes/step-session.mjs";

const level = { source: { x: 0, y: 0, dir: "E" }, goal: { x: 3, y: 0 } };
const engine = {
  initialPulse: l => ({ ...l.source, outcome: "moving" }),
  stepPulse: (l, pulse, mirror) => {
    const x = pulse.x + 1;
    return { ...pulse, x, outcome: x === l.goal.x && mirror === "/" ? "won" : x >= l.goal.x ? "escaped" : "moving" };
  }
};

// Mirrors the real live-engine.mjs outcome convention: null means in flight.
// The adapter intentionally takes (level, pulse, mirrors), while the other
// agent's engine takes (level, mirrors, pulse) and can be wrapped in one lambda.
const nullOutcomeEngine = {
  initialPulse: l => ({ ...l.source, outcome: null, steps: 0 }),
  stepPulse: (l, pulse, mirror) => {
    const x = pulse.x + 1;
    return {
      ...pulse,
      x,
      steps: pulse.steps + 1,
      outcome: x === l.goal.x ? (mirror === "/" ? "won" : "escaped") : null
    };
  }
};

test("step mode does not advance without an explicit call", () => {
  const session = createStepSession(level, engine, "\\");
  assert.equal(session.snapshot.pulse.x, 0);
  session.rotate("/");
  assert.equal(session.snapshot.pulse.x, 0);
  assert.equal(session.snapshot.steps, 0);
});

test("mirror changes between steps affect future routing", () => {
  const session = createStepSession(level, engine, "\\");
  session.advance();
  session.advance();
  assert.equal(session.snapshot.pulse.x, 2);
  session.rotate("/");
  assert.equal(session.advance().pulse.outcome, "won");
  assert.equal(session.snapshot.steps, 3);
});

test("terminal state cannot advance or rotate until reset", () => {
  const session = createStepSession(level, engine, "\\");
  for (let i = 0; i < 3; i++) session.advance();
  assert.equal(session.snapshot.pulse.outcome, "escaped");
  const before = session.snapshot;
  session.advance();
  session.rotate("/");
  assert.deepEqual(session.snapshot, before);
  session.reset("/");
  assert.equal(session.snapshot.pulse.outcome, "moving");
  assert.equal(session.snapshot.steps, 0);
  assert.equal(session.snapshot.generation, before.generation + 1);
});

test("live engine's null active outcome advances and accepts between-step rotation", () => {
  const session = createStepSession(level, nullOutcomeEngine, "\\");
  assert.equal(session.snapshot.pulse.outcome, null);
  session.advance();
  assert.equal(session.snapshot.pulse.x, 1);
  session.advance();
  assert.equal(session.snapshot.pulse.x, 2);
  session.rotate("/");
  assert.equal(session.advance().pulse.outcome, "won");
  assert.equal(session.snapshot.pulse.steps, 3);
});

test("null-outcome terminal failure remains locked; reset begins new attempt", () => {
  const session = createStepSession(level, nullOutcomeEngine, "\\");
  session.advance();
  session.advance();
  assert.equal(session.advance().pulse.outcome, "escaped");
  const failed = session.snapshot;
  session.advance();
  session.rotate("/");
  assert.deepEqual(session.snapshot, failed);
  session.reset();
  assert.equal(session.snapshot.pulse.outcome, null);
  assert.equal(session.snapshot.steps, 0);
  assert.equal(session.snapshot.mirrors, "\\");
});

test("invalid engines fail immediately", () => {
  assert.throws(() => createStepSession(level, {}, "/"), TypeError);
});

test("custom isActive predicate supports third-party pulse statuses", () => {
  const specialEngine = {
    initialPulse: l => ({ ...l.source, status: "flying" }),
    stepPulse: (l, pulse) => ({ ...pulse, x: pulse.x + 1, status: pulse.x + 1 >= l.goal.x ? "delivered" : "flying" }),
    isActive: pulse => pulse.status === "flying"
  };
  const session = createStepSession(level, specialEngine, {});
  session.advance();
  session.rotate({ flip: true });
  session.advance();
  assert.equal(session.snapshot.pulse.x, 2);
  assert.equal(session.advance().pulse.status, "delivered");
  session.advance();
  assert.equal(session.snapshot.steps, 3);
  assert.deepEqual(session.snapshot.mirrors, { flip: true });
});

test("non-callable isActive is rejected", () => {
  assert.throws(() => createStepSession(level, { ...engine, isActive: false }, {}), /isActive/);
});
