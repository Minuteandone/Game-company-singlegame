import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/levels.mjs";
import { createMirrorState, tracePulse } from "../src/engine.mjs";
import { applyTurn, undoTurn } from "../src/turn-history.mjs";

test("undo restores the first teaching puzzle's original mirror state", () => {
  const original = createMirrorState(LEVELS[0]);
  const history = [];
  const turned = applyTurn(original, history, 3, 3);
  assert.equal(turned.turned, true);
  assert.equal(turned.mirrors["3,3"], "/");
  assert.equal(tracePulse(LEVELS[0], turned.mirrors).outcome, "won");
  const restored = undoTurn(turned.mirrors, turned.history);
  assert.deepEqual(restored.mirrors, original);
  assert.deepEqual(restored.history, []);
  assert.deepEqual(restored.undone, { x: 3, y: 3 });
  assert.notEqual(tracePulse(LEVELS[0], restored.mirrors).outcome, "won");
  assert.equal(original["3,3"], "\\", "authored state is immutable");
  assert.deepEqual(history, [], "the caller's original history is immutable");
});

test("undo reverts the most recent mirror first, preserving earlier turns", () => {
  const original = createMirrorState(LEVELS[1]);
  const first = applyTurn(original, [], 3, 5);
  const second = applyTurn(first.mirrors, first.history, 6, 1);
  assert.equal(second.history.length, 2);
  assert.notDeepEqual(second.mirrors, first.mirrors);
  const once = undoTurn(second.mirrors, second.history);
  assert.deepEqual(once.undone, { x: 6, y: 1 });
  assert.deepEqual(once.mirrors, first.mirrors);
  const twice = undoTurn(once.mirrors, once.history);
  assert.deepEqual(twice.undone, { x: 3, y: 5 });
  assert.deepEqual(twice.mirrors, original);
  assert.deepEqual(twice.history, []);
});

test("repeated turns on one mirror are undone one at a time", () => {
  const original = createMirrorState(LEVELS[0]);
  const first = applyTurn(original, [], 3, 3);
  const second = applyTurn(first.mirrors, first.history, 3, 3);
  assert.deepEqual(second.mirrors, original);
  const once = undoTurn(second.mirrors, second.history);
  assert.equal(once.mirrors["3,3"], "/");
  assert.equal(once.history.length, 1);
  const twice = undoTurn(once.mirrors, once.history);
  assert.deepEqual(twice.mirrors, original);
  assert.equal(twice.history.length, 0);
});

test("attempted turn at a non-mirror cell cannot pollute undo history", () => {
  const mirrors = createMirrorState(LEVELS[0]);
  const history = [];
  const unchanged = applyTurn(mirrors, history, 0, 0);
  assert.equal(unchanged.turned, false);
  assert.strictEqual(unchanged.mirrors, mirrors);
  assert.strictEqual(unchanged.history, history);
  const emptyUndo = undoTurn(unchanged.mirrors, unchanged.history);
  assert.equal(emptyUndo.undone, null);
  assert.strictEqual(emptyUndo.mirrors, mirrors);
  assert.strictEqual(emptyUndo.history, history);
});
