import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/levels.mjs";
import { createMirrorState, positionKey, reflect, rotateMirror, tracePulse } from "../src/engine.mjs";

test("reflection geometry is correct in all four directions", () => {
  assert.deepEqual(["N", "E", "S", "W"].map(d => reflect(d, "/")), ["E", "N", "W", "S"]);
  assert.deepEqual(["N", "E", "S", "W"].map(d => reflect(d, "\\")), ["W", "S", "E", "N"]);
  assert.throws(() => reflect("X", "/"), /Unknown direction/);
});

test("each shipped level starts unsolved and has a known solution", () => {
  const solutions = [
    { "3,3": "/" },
    { "3,5": "/", "3,1": "/", "6,1": "\\" },
    { "2,1": "\\", "2,5": "\\", "7,5": "/", "7,2": "/" },
    { "2,4": "/", "2,1": "/", "6,1": "\\", "6,5": "\\", "8,5": "/" }
  ];
  for (const [index, level] of LEVELS.entries()) {
    const initial = createMirrorState(level);
    assert.notEqual(tracePulse(level, initial).outcome, "won", level.id + " should start unsolved");
    const winning = { ...initial, ...solutions[index] };
    assert.equal(tracePulse(level, winning).outcome, "won", level.id + " should be solvable");
    assert.deepEqual(createMirrorState(level), initial, "simulation must not mutate authored mirrors");
  }
});

test("rotations are immutable and ignore non-mirror cells", () => {
  const original = createMirrorState(LEVELS[0]);
  const result = rotateMirror(original, 3, 3);
  assert.equal(original[positionKey(3, 3)], "\\");
  assert.equal(result[positionKey(3, 3)], "/");
  assert.strictEqual(rotateMirror(original, 0, 0), original);
});

test("walls absorb the pulse", () => {
  const level = {
    width: 3, height: 1,
    source: { x: 0, y: 0, dir: "E" },
    goal: { x: 2, y: 0 },
    mirrors: [], walls: [{ x: 1, y: 0 }]
  };
  assert.equal(tracePulse(level).outcome, "blocked");
});

test("a pulse that leaves the grid reports escaped", () => {
  const level = {
    width: 2, height: 2,
    source: { x: 0, y: 0, dir: "N" },
    goal: { x: 1, y: 1 },
    mirrors: [], walls: []
  };
  assert.equal(tracePulse(level).outcome, "escaped");
});

test("repeated beam states are detected instead of looping forever", () => {
  const level = {
    width: 5, height: 5,
    source: { x: 2, y: 1, dir: "E" },
    goal: { x: 4, y: 4 },
    walls: [],
    mirrors: [
      { x: 3, y: 1, orientation: "\\" },
      { x: 3, y: 3, orientation: "/" },
      { x: 1, y: 3, orientation: "\\" },
      { x: 1, y: 1, orientation: "/" }
    ]
  };
  assert.equal(tracePulse(level).outcome, "loop");
});

test("teaching progression starts with exactly one change and preserves a correct mirror", () => {
  const first = createMirrorState(LEVELS[0]);
  assert.equal(LEVELS[0].mirrors.length, 1);
  assert.equal(tracePulse(LEVELS[0], rotateMirror(first, 3, 3)).outcome, "won");
  assert.equal(createMirrorState(LEVELS[1])["3,1"], "/");
});

test("straight-line receiver returns all traveled cells in order", () => {
  const level = {
    width: 4, height: 1, source: { x: 0, y: 0, dir: "E" },
    goal: { x: 3, y: 0 }, mirrors: [], walls: []
  };
  const result = tracePulse(level);
  assert.equal(result.outcome, "won");
  assert.deepEqual(result.path.map(({ x, y }) => [x, y]), [[0, 0], [1, 0], [2, 0], [3, 0]]);
});

test("slash and backslash vector fixtures give distinct receiver outcomes", () => {
  const base = {
    width: 3, height: 3, source: { x: 1, y: 2, dir: "N" },
    mirrors: [{ x: 1, y: 1, orientation: "/" }], walls: []
  };
  const slash = { ...base, goal: { x: 2, y: 1 } };
  const backslash = { ...base, goal: { x: 0, y: 1 } };
  assert.equal(tracePulse(slash).outcome, "won");
  assert.deepEqual(tracePulse(slash).path.map(({ x, y }) => [x, y]), [[1, 2], [1, 1], [2, 1]]);
  const backslashMirrors = rotateMirror(createMirrorState(base), 1, 1);
  assert.equal(tracePulse(backslash, backslashMirrors).outcome, "won");
  assert.deepEqual(tracePulse(backslash, backslashMirrors).path.map(({ x, y }) => [x, y]), [[1, 2], [1, 1], [0, 1]]);
});

test("changing a mirror changes only the trace downstream from that mirror", () => {
  const level = {
    width: 3, height: 3,
    source: { x: 1, y: 2, dir: "N" },
    goal: { x: 2, y: 1 },
    walls: [], mirrors: [{ x: 1, y: 1, orientation: "/" }]
  };
  const before = tracePulse(level);
  const after = tracePulse(level, rotateMirror(createMirrorState(level), 1, 1));
  assert.equal(before.outcome, "won");
  assert.equal(after.outcome, "escaped");
  assert.deepEqual(before.path.slice(0, 2).map(p => [p.x, p.y]),
    after.path.slice(0, 2).map(p => [p.x, p.y]));
  assert.notDeepEqual(before.path.slice(2), after.path.slice(2));
});

test("goal-less boundary vector exits without fabricating an off-grid cell", () => {
  const level = {
    width: 3, height: 1,
    source: { x: 0, y: 0, dir: "E" },
    goal: null, mirrors: [], walls: []
  };
  const result = tracePulse(level);
  assert.equal(result.outcome, "escaped");
  assert.deepEqual(result.path.map(({ x, y }) => [x, y]), [[0, 0], [1, 0], [2, 0]]);
});
