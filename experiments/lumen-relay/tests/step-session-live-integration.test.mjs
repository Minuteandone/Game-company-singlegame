import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "../spikes/live-engine.mjs";
import { LIVE_LEVEL } from "../spikes/live-level.mjs";
import { createStepSession } from "../spikes/step-session.mjs";

const liveEngineAdapter = Object.freeze({
  initialPulse: createLivePulse,
  stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
});

function makeSession() {
  return createStepSession(
    LIVE_LEVEL,
    liveEngineAdapter,
    createMirrorState(LIVE_LEVEL)
  );
}

function rotateAt(session, x, y) {
  const snapshot = session.snapshot;
  return session.rotate(rotateMirror(snapshot.mirrors, x, y));
}

test("shared step session drives the real live engine to the Relay Window goal", () => {
  const session = makeSession();

  // Nothing moves until the player explicitly advances.
  const start = session.snapshot;
  rotateAt(session, 2, 4);
  assert.equal(session.snapshot.steps, 0);
  assert.deepEqual(session.snapshot.pulse, start.pulse);

  // One warning cell, then enter the first live mirror using its new state.
  session.advance();
  assert.deepEqual(
    [session.snapshot.pulse.x, session.snapshot.pulse.y],
    [1, 4]
  );
  session.advance();
  assert.deepEqual(
    [session.snapshot.pulse.x, session.snapshot.pulse.y, session.snapshot.pulse.dir],
    [2, 4, "N"]
  );

  // Advance until one cell before the second live mirror.
  let guard = 0;
  while (
    !session.snapshot.pulse.outcome &&
    !(session.snapshot.pulse.x === 5 && session.snapshot.pulse.y === 1)
  ) {
    session.advance();
    guard += 1;
    assert.ok(guard < 20, "step session did not reach the second decision point");
  }

  assert.equal(session.snapshot.pulse.outcome, null);

  // Change the second mirror between steps, then finish the same real route.
  rotateAt(session, 6, 1);
  const stepsBeforeSecondTurn = session.snapshot.steps;

  while (!session.snapshot.pulse.outcome) {
    session.advance();
    guard += 1;
    assert.ok(guard < 40, "step session did not terminate");
  }

  const finished = session.snapshot;
  assert.equal(finished.pulse.outcome, "won");
  assert.deepEqual(
    [finished.pulse.x, finished.pulse.y],
    [LIVE_LEVEL.goal.x, LIVE_LEVEL.goal.y]
  );
  assert.ok(finished.steps > stepsBeforeSecondTurn);
});
