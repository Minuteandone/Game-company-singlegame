import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectStepLevel } from "../spikes/step-level.mjs";
import { LIVE_LEVEL } from "../spikes/live-level.mjs";
import { DOUBLE_PASS_LEVEL } from "../spikes/double-pass-level.mjs";

test("step-level selection defaults to Relay Window", () => {
  assert.equal(selectStepLevel(), LIVE_LEVEL);
  assert.equal(selectStepLevel(""), LIVE_LEVEL);
  assert.equal(selectStepLevel("?level=unknown"), LIVE_LEVEL);
  assert.equal(selectStepLevel("?level=relay-window"), LIVE_LEVEL);
});

test("step-level selection opts into exact Double Pass geometry", () => {
  const level = selectStepLevel("?level=double-pass");
  assert.strictEqual(level, DOUBLE_PASS_LEVEL);
  assert.equal(level.liveMirrorKeys.length, 1);
  assert.deepEqual(level.liveMirrorKeys, ["4,3"]);
  assert.equal(level.goal.x, 0);
  assert.equal(level.goal.y, 3);
  assert.strictEqual(selectStepLevel("level=double-pass&foo=bar"), DOUBLE_PASS_LEVEL);
});

test("step-mode puzzle choices and real-time fallback are discoverable", () => {
  const stepPage = readFileSync(new URL("../spikes/step-routing.html", import.meta.url), "utf8");
  const doublePage = readFileSync(new URL("../spikes/double-pass.html", import.meta.url), "utf8");
  const control = readFileSync(new URL("../spikes/step-routing.mjs", import.meta.url), "utf8");
  assert.match(stepPage, /data-step-level="relay-window"/);
  assert.match(stepPage, /data-step-level="double-pass"/);
  assert.match(stepPage, /step-routing\.html\?level=double-pass/);
  assert.match(doublePage, /href="\.\/step-routing\.html\?level=double-pass"/);
  assert.match(control, /selectStepLevel\(window\.location\.search\)/);
  assert.match(control, /headingNames\[dir\]/);
});
