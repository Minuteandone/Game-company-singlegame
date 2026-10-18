import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { createStepSession } from "../spikes/step-session.mjs";
import { advanceLivePulse, createLivePulse } from "../spikes/live-engine.mjs";
import { DOUBLE_PASS_LEVEL } from "../spikes/double-pass-level.mjs";

function newSession() {
  return createStepSession(
    DOUBLE_PASS_LEVEL,
    {
      initialPulse: createLivePulse,
      stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
    },
    createMirrorState(DOUBLE_PASS_LEVEL)
  );
}

function untilTerminal(session) {
  const cap = DOUBLE_PASS_LEVEL.maxLiveSteps + 1;
  for (let i = 0; i < cap && !session.snapshot.pulse.outcome; i++) {
    session.advance();
  }
  assert.ok(session.snapshot.pulse.outcome, "live engine eventually returns an outcome");
  return session.snapshot;
}

test("actual live-engine integration: no flip cannot solve Double Pass", () => {
  const session = newSession();
  assert.equal(session.snapshot.pulse.outcome, null);
  assert.notEqual(untilTerminal(session).pulse.outcome, "won");
});

test("actual live-engine integration: flipping before first arrival also fails", () => {
  const session = newSession();
  session.rotate(rotateMirror(session.snapshot.mirrors, 4, 3));
  assert.equal(session.snapshot.mirrors["4,3"], "\\");
  assert.notEqual(untilTerminal(session).pulse.outcome, "won");
});

test("actual live-engine integration: flip after first arrival wins with no timer", () => {
  const session = newSession();
  assert.equal(session.snapshot.steps, 0);
  session.advance();
  assert.deepEqual([session.snapshot.pulse.x, session.snapshot.pulse.y], [3, 3]);
  session.advance();
  assert.deepEqual([session.snapshot.pulse.x, session.snapshot.pulse.y], [4, 3]);
  assert.equal(session.snapshot.pulse.dir, "N");
  assert.equal(session.snapshot.mirrors["4,3"], "/");

  const prefix = session.snapshot.pulse.path.map(({ x, y, dir }) => ({ x, y, dir }));
  session.rotate(rotateMirror(session.snapshot.mirrors, 4, 3));
  assert.equal(session.snapshot.pulse.x, 4, "rotation does not advance the pulse");
  assert.deepEqual(session.snapshot.pulse.path, prefix, "past route never changes retroactively");
  const result = untilTerminal(session);
  assert.equal(result.pulse.outcome, "won");
  assert.equal(result.mirrors["4,3"], "\\");
  assert.equal(result.steps, result.pulse.steps);
  const visits = result.pulse.path.filter(({ x, y }) => x === 4 && y === 3);
  assert.equal(visits.length, 2);
  assert.deepEqual(visits.map(({ dir }) => dir), ["N", "W"]);
});

test("actual live-engine integration: flipping after second arrival cannot redirect history", () => {
  const session = newSession();
  let visits = 0;
  for (let i = 0; i < DOUBLE_PASS_LEVEL.maxLiveSteps && !session.snapshot.pulse.outcome; i++) {
    session.advance();
    if (session.snapshot.pulse.x === 4 && session.snapshot.pulse.y === 3) {
      visits++;
      if (visits === 2) break;
    }
  }
  assert.equal(visits, 2);
  assert.equal(session.snapshot.pulse.dir, "E", "too late: unflipped second pass already heads east");
  session.rotate(rotateMirror(session.snapshot.mirrors, 4, 3));
  assert.equal(session.snapshot.pulse.dir, "E");
  assert.notEqual(untilTerminal(session).pulse.outcome, "won");
});

test("actual live-engine integration: terminal lock and reset create clean attempt", () => {
  const session = newSession();
  untilTerminal(session);
  const finished = session.snapshot;
  session.advance();
  session.rotate({ ...finished.mirrors, "4,3": "\\" });
  assert.deepEqual(session.snapshot, finished);
  session.reset(createMirrorState(DOUBLE_PASS_LEVEL));
  assert.equal(session.snapshot.generation, finished.generation + 1);
  assert.equal(session.snapshot.steps, 0);
  assert.equal(session.snapshot.pulse.outcome, null);
  assert.equal(session.snapshot.mirrors["4,3"], "/");
});
