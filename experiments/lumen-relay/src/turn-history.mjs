import { positionKey, rotateMirror } from "./engine.mjs";

/**
 * Pure mirror-turn history for the turn-based baseline.
 * No mutation of the mirror map or history list.
 */
export function applyTurn(mirrors, history, x, y) {
  if (!Object.hasOwn(mirrors, positionKey(x, y))) {
    return { mirrors, history, turned: false };
  }
  return {
    mirrors: rotateMirror(mirrors, x, y),
    history: [...history, { x, y }],
    turned: true
  };
}

export function undoTurn(mirrors, history) {
  if (history.length === 0) {
    return { mirrors, history, undone: null };
  }
  const undone = history[history.length - 1];
  return {
    mirrors: rotateMirror(mirrors, undone.x, undone.y),
    history: history.slice(0, -1),
    undone
  };
}
