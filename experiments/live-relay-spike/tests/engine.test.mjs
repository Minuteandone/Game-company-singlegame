import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_RELAY_LEVEL,
  initialPulse,
  isLiveMirror,
  reflect,
  stepPulse
} from "../src/engine.mjs";

function runStatic(orientation) {
  let pulse = initialPulse(LIVE_RELAY_LEVEL);
  for (let step = 0; step < 80 && pulse.outcome === "moving"; step += 1) {
    pulse = stepPulse(LIVE_RELAY_LEVEL, pulse, orientation);
  }
  return pulse;
}

test("reflection table matches Lumen Relay geometry", () => {
  assert.deepEqual(["N", "E", "S", "W"].map(dir => reflect(dir, "/")), ["E", "N", "W", "S"]);
  assert.deepEqual(["N", "E", "S", "W"].map(dir => reflect(dir, "\\")), ["W", "S", "E", "N"]);
});

test("the live mirror samples its current orientation on entry", () => {
  const approach = { x: 3, y: 3, dir: "E", outcome: "moving" };
  assert.equal(stepPulse(LIVE_RELAY_LEVEL, approach, "/").dir, "N");
  assert.equal(stepPulse(LIVE_RELAY_LEVEL, approach, "\\").dir, "S");
});

test("neither static live-mirror orientation can solve the authored route", () => {
  assert.notEqual(runStatic("/").outcome, "won");
  assert.notEqual(runStatic("\\").outcome, "won");
});

test("flipping after the first live-mirror pass solves the route", () => {
  let orientation = "/";
  let pulse = initialPulse(LIVE_RELAY_LEVEL);
  let visits = 0;

  for (let step = 0; step < 80 && pulse.outcome === "moving"; step += 1) {
    pulse = stepPulse(LIVE_RELAY_LEVEL, pulse, orientation);
    if (isLiveMirror(LIVE_RELAY_LEVEL, pulse.x, pulse.y)) {
      visits += 1;
      if (visits === 1) orientation = "\\";
    }
  }

  assert.equal(visits, 2);
  assert.equal(pulse.outcome, "won");
  assert.deepEqual([pulse.x, pulse.y], [LIVE_RELAY_LEVEL.goal.x, LIVE_RELAY_LEVEL.goal.y]);
});

test("the dynamic solution revisits the live mirror from a different heading", () => {
  let orientation = "/";
  let pulse = initialPulse(LIVE_RELAY_LEVEL);
  const headings = [];

  for (let step = 0; step < 80 && pulse.outcome === "moving"; step += 1) {
    pulse = stepPulse(LIVE_RELAY_LEVEL, pulse, orientation);
    if (isLiveMirror(LIVE_RELAY_LEVEL, pulse.x, pulse.y)) {
      headings.push(pulse.dir);
      if (headings.length === 1) orientation = "\\";
    }
  }

  assert.deepEqual(headings, ["N", "W"]);
});
