export const DIRECTIONS = Object.freeze({
  N: Object.freeze({ x: 0, y: -1 }),
  E: Object.freeze({ x: 1, y: 0 }),
  S: Object.freeze({ x: 0, y: 1 }),
  W: Object.freeze({ x: -1, y: 0 })
});

export const positionKey = (x, y) => `${x},${y}`;

export function reflect(direction, orientation) {
  if (!Object.hasOwn(DIRECTIONS, direction)) {
    throw new Error("Unknown direction: " + direction);
  }
  if (orientation === "/") {
    return { N: "E", E: "N", S: "W", W: "S" }[direction];
  }
  if (orientation === "\\") {
    return { N: "W", E: "S", S: "E", W: "N" }[direction];
  }
  throw new Error("Unknown mirror orientation: " + orientation);
}

export function initialPulse(level) {
  return { ...level.source, outcome: "moving" };
}

export function isLiveMirror(level, x, y) {
  return x === level.liveMirror.x && y === level.liveMirror.y;
}

export function stepPulse(level, pulse, liveOrientation) {
  if (pulse.outcome !== "moving") return pulse;

  const movement = DIRECTIONS[pulse.dir];
  if (!movement) throw new Error("Unknown direction: " + pulse.dir);

  const x = pulse.x + movement.x;
  const y = pulse.y + movement.y;

  if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
    return { ...pulse, outcome: "escaped" };
  }

  if (level.goal && x === level.goal.x && y === level.goal.y) {
    return { x, y, dir: pulse.dir, outcome: "won" };
  }

  const wallKeys = new Set((level.walls ?? []).map(wall => positionKey(wall.x, wall.y)));
  if (wallKeys.has(positionKey(x, y))) {
    return { x, y, dir: pulse.dir, outcome: "blocked" };
  }

  let dir = pulse.dir;
  if (isLiveMirror(level, x, y)) {
    dir = reflect(dir, liveOrientation);
  } else {
    const fixed = (level.fixedMirrors ?? []).find(mirror => mirror.x === x && mirror.y === y);
    if (fixed) dir = reflect(dir, fixed.orientation);
  }

  return { x, y, dir, outcome: "moving" };
}

export const LIVE_RELAY_LEVEL = Object.freeze({
  width: 7,
  height: 5,
  source: Object.freeze({ x: 2, y: 3, dir: "E" }),
  goal: Object.freeze({ x: 0, y: 3 }),
  liveMirror: Object.freeze({ x: 4, y: 3 }),
  fixedMirrors: Object.freeze([
    Object.freeze({ x: 4, y: 1, orientation: "/" }),
    Object.freeze({ x: 6, y: 1, orientation: "\\" }),
    Object.freeze({ x: 6, y: 4, orientation: "/" }),
    Object.freeze({ x: 4, y: 4, orientation: "\\" })
  ]),
  walls: Object.freeze([])
});
