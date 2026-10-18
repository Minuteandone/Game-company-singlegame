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

test("invalid engines fail immediately", () => {
  assert.throws(() => createStepSession(level, {}, "/"), TypeError);
});
