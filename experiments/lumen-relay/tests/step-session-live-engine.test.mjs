import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "../spikes/live-engine.mjs";
import { LIVE_LEVEL } from "../spikes/live-level.mjs";
import { createStepSession } from "../spikes/step-session.mjs";

function makeSession() {
  return createStepSession(
    LIVE_LEVEL,
    {
      initialPulse: createLivePulse,
      stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
    },
    createMirrorState(LIVE_LEVEL)
  );
}

test("shared step session drives the real Relay Window live engine to a win", () => {
  const session = makeSession();

  // Step once to create a visible warning before the first live mirror.
  assert.equal(session.advance().pulse.x, 1);

  let current = session.snapshot;
  session.rotate(rotateMirror(current.mirrors, 2, 4));

  while (!session.snapshot.pulse.outcome && session.snapshot.steps < 8) {
    session.advance();
  }

  current = session.snapshot;
  assert.deepEqual([current.pulse.x, current.pulse.y, current.pulse.dir], [5, 1, "E"]);

  session.rotate(rotateMirror(current.mirrors, 6, 1));
  while (!session.snapshot.pulse.outcome) {
    session.advance();
  }

  current = session.snapshot;
  assert.equal(current.pulse.outcome, "won");
  assert.deepEqual(current.pulse.path.at(-1), { x: 6, y: 4, dir: "S" });
  assert.equal(current.steps, current.pulse.steps);
});

test("shared step session locks the real live engine after a terminal outcome", () => {
  const session = makeSession();

  while (!session.snapshot.pulse.outcome) {
    session.advance();
  }

  const terminal = session.snapshot;
  assert.equal(terminal.pulse.outcome, "escaped");

  session.advance();
  session.rotate(rotateMirror(terminal.mirrors, 2, 4));
  assert.deepEqual(session.snapshot, terminal);

  const reset = session.reset();
  assert.equal(reset.pulse.outcome, null);
  assert.equal(reset.steps, 0);
  assert.equal(reset.generation, terminal.generation + 1);
});
