import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectStepLevel } from "../spikes/step-level-choice.mjs";
import { LIVE_LEVEL } from "../spikes/live-level.mjs";
import { DOUBLE_PASS_LEVEL } from "../spikes/double-pass-level.mjs";
import { createMirrorState, rotateMirror } from "../src/engine.mjs";
import { createLivePulse, advanceLivePulse } from "../spikes/live-engine.mjs";
import { createStepSession } from "../spikes/step-session.mjs";

test("step mode defaults to Relay Window and uses an allowlisted Double Pass query", () => {
  assert.strictEqual(selectStepLevel(""), LIVE_LEVEL);
  assert.strictEqual(selectStepLevel("?level=double-pass"), DOUBLE_PASS_LEVEL);
  assert.strictEqual(selectStepLevel("?level=relay-window"), LIVE_LEVEL);
  assert.strictEqual(selectStepLevel("?level=%2F%2Fexample.com"), LIVE_LEVEL);
  assert.strictEqual(selectStepLevel("?level=double-pass-extra"), LIVE_LEVEL);
});

test("Double Pass query provides the original fixture rather than a modified copy", () => {
  const level = selectStepLevel("?level=double-pass");
  assert.strictEqual(level, DOUBLE_PASS_LEVEL);
  assert.deepEqual(level.liveMirrorKeys, ["4,3"]);
  assert.deepEqual(level.goal, { x: 0, y: 3 });
});

test("selected Double Pass is solvable using the shared controller, entirely without a timer", () => {
  const level = selectStepLevel("?level=double-pass");
  const session = createStepSession(level, {
    initialPulse: createLivePulse,
    stepPulse: (l, pulse, mirrors) => advanceLivePulse(l, mirrors, pulse)
  }, createMirrorState(level));

  // The pulse must first meet the mirror in its initial slash state.
  session.advance();
  session.advance();
  assert.deepEqual([session.snapshot.pulse.x, session.snapshot.pulse.y, session.snapshot.pulse.dir],
    [4, 3, "N"]);
  assert.equal(session.snapshot.steps, 2);

  session.rotate(rotateMirror(session.snapshot.mirrors, 4, 3));
  assert.equal(session.snapshot.steps, 2, "rotation must not advance time");

  for (let i = 0; i < level.maxLiveSteps && !session.snapshot.pulse.outcome; i++) {
    session.advance();
  }
  assert.equal(session.snapshot.pulse.outcome, "won");
  assert.equal(session.snapshot.pulse.path.filter(({ x, y }) => x === 4 && y === 3).length, 2);
});

test("the step page exposes a discoverable Double Pass route and an optional pass count", () => {
  const path = fileURLToPath(new URL("../spikes/step-routing.html", import.meta.url));
  const page = readFileSync(path, "utf8");
  assert.match(page, /step-routing\.html\?level=double-pass/);
  assert.match(page, /id="passes-wrap" hidden/);
  assert.match(page, /id="mode-switch"/);
  assert.match(page, /id="advance"/);
});
