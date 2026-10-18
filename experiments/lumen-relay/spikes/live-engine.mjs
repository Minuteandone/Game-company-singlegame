import { DIRECTIONS, positionKey, reflect } from "../src/engine.mjs";

/**
 * Advance a pulse by exactly one grid cell using the mirror state supplied
 * for this tick. That is the key difference from tracePulse(): callers may
 * rotate mirrors between steps.
 */
export function advanceLivePulse(level, mirrors, pulse) {
  if (pulse.outcome) return pulse;

  const movement = DIRECTIONS[pulse.dir];
  if (!movement) throw new Error("Unknown direction: " + pulse.dir);

  const nextX = pulse.x + movement.x;
  const nextY = pulse.y + movement.y;
  const nextSteps = pulse.steps + 1;

  if (nextX < 0 || nextX >= level.width || nextY < 0 || nextY >= level.height) {
    return { ...pulse, steps: nextSteps, outcome: "escaped" };
  }

  const key = positionKey(nextX, nextY);
  const walls = new Set((level.walls ?? []).map(({ x, y }) => positionKey(x, y)));
  let dir = pulse.dir;
  const path = [...pulse.path, { x: nextX, y: nextY, dir }];

  if (walls.has(key)) {
    return { x: nextX, y: nextY, dir, steps: nextSteps, path, outcome: "blocked" };
  }

  if (level.goal && nextX === level.goal.x && nextY === level.goal.y) {
    return { x: nextX, y: nextY, dir, steps: nextSteps, path, outcome: "won" };
  }

  if (Object.hasOwn(mirrors, key)) {
    dir = reflect(dir, mirrors[key]);
    path[path.length - 1] = { x: nextX, y: nextY, dir };
  }

  const maxSteps = level.maxLiveSteps ?? level.width * level.height * 6;
  const outcome = nextSteps >= maxSteps ? "timeout" : null;
  return { x: nextX, y: nextY, dir, steps: nextSteps, path, outcome };
}

export function createLivePulse(level) {
  return {
    ...level.source,
    steps: 0,
    path: [{ ...level.source }],
    outcome: null
  };
}
