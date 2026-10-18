import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "../spikes/live-engine.mjs";
import { DOUBLE_PASS_LEVEL } from "../spikes/double-pass-level.mjs";

function runToEnd(mirrors, pulse = createLivePulse(DOUBLE_PASS_LEVEL)) {
  while (!pulse.outcome) {
    pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse);
  }
  return pulse;
}

test("neither static orientation solves Double Pass", () => {
  const slashMirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  assert.equal(runToEnd(slashMirrors).outcome, "escaped");

  const backslashMirrors = rotateMirror(slashMirrors, 4, 3);
  assert.equal(runToEnd(backslashMirrors).outcome, "escaped");
});

test("flipping after the first pass but before the return wins", () => {
  let mirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  let pulse = createLivePulse(DOUBLE_PASS_LEVEL);

  pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse); // (3,3)
  pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse); // first live visit (4,3), "/" -> N
  pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse); // (4,2), safely past live mirror

  mirrors = rotateMirror(mirrors, 4, 3); // prepare "\" for the return
  pulse = runToEnd(mirrors, pulse);

  assert.equal(pulse.outcome, "won");
  assert.deepEqual(pulse.path.at(-1), { x: 0, y: 3, dir: "W" });
});

test("flipping before the first live-mirror arrival is too early", () => {
  let mirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  let pulse = createLivePulse(DOUBLE_PASS_LEVEL);

  pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse); // (3,3)
  mirrors = rotateMirror(mirrors, 4, 3); // too early: first arrival now sees "\"
  pulse = runToEnd(mirrors, pulse);

  assert.equal(pulse.outcome, "escaped");
});

test("flipping after the second live-mirror arrival is too late", () => {
  let mirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  let pulse = createLivePulse(DOUBLE_PASS_LEVEL);
  let liveVisits = 0;

  while (!pulse.outcome && liveVisits < 2) {
    pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, mirrors, pulse);
    if (pulse.x === 4 && pulse.y === 3) liveVisits += 1;
  }

  assert.equal(liveVisits, 2);
  assert.equal(pulse.dir, "E", "second arrival already reflected using the stale slash state");

  mirrors = rotateMirror(mirrors, 4, 3); // too late to change the reflection already taken
  pulse = runToEnd(mirrors, pulse);

  assert.equal(pulse.outcome, "escaped");
});
