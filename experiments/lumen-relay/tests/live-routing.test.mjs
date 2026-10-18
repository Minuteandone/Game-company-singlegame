import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "../spikes/live-engine.mjs";
import { LIVE_LEVEL } from "../spikes/live-level.mjs";

function runToEnd(mirrors) {
  let pulse = createLivePulse(LIVE_LEVEL);
  while (!pulse.outcome) pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse);
  return pulse;
}

test("the authored live level is not solvable if the player never acts", () => {
  const result = runToEnd(createMirrorState(LIVE_LEVEL));
  assert.equal(result.outcome, "escaped");
});

test("the same level is solvable with the two intended mirror states", () => {
  let mirrors = createMirrorState(LIVE_LEVEL);
  mirrors = rotateMirror(mirrors, 2, 4);
  mirrors = rotateMirror(mirrors, 6, 1);
  const result = runToEnd(mirrors);
  assert.equal(result.outcome, "won");
  assert.deepEqual(result.path.at(-1), { x: 6, y: 4, dir: "S" });
});

test("rotating the first mirror after the pulse reaches it is too late", () => {
  let mirrors = createMirrorState(LIVE_LEVEL);
  let pulse = createLivePulse(LIVE_LEVEL);

  pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse); // (1,4)
  pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse); // enters (2,4), turns south
  mirrors = rotateMirror(mirrors, 2, 4);

  while (!pulse.outcome) pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse);
  assert.equal(pulse.outcome, "escaped");
});

test("mirror changes between ticks alter the actual moving pulse route", () => {
  let mirrors = createMirrorState(LIVE_LEVEL);
  let pulse = createLivePulse(LIVE_LEVEL);

  pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse); // one-cell warning
  mirrors = rotateMirror(mirrors, 2, 4); // save first turn

  while (!pulse.outcome && pulse.steps < 8) {
    pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse);
  }
  assert.equal(pulse.x, 5);
  assert.equal(pulse.y, 1);
  assert.equal(pulse.dir, "E");

  mirrors = rotateMirror(mirrors, 6, 1); // save second turn
  while (!pulse.outcome) pulse = advanceLivePulse(LIVE_LEVEL, mirrors, pulse);

  assert.equal(pulse.outcome, "won");
  assert.deepEqual(pulse.path.map(({ x, y }) => [x, y]), [
    [0,4], [1,4], [2,4], [2,3], [2,2], [2,1],
    [3,1], [4,1], [5,1], [6,1], [6,2], [6,3], [6,4]
  ]);
});
