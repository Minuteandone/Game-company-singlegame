// Pure puzzle logic: no DOM, timers, browser APIs, or dependencies.
export const DIRECTIONS = Object.freeze({
  N: Object.freeze({ x: 0, y: -1 }),
  E: Object.freeze({ x: 1, y: 0 }),
  S: Object.freeze({ x: 0, y: 1 }),
  W: Object.freeze({ x: -1, y: 0 })
});

export const positionKey = (x, y) => x + "," + y;

export function createMirrorState(level) {
  return Object.fromEntries(
    (level.mirrors ?? []).map(mirror => [positionKey(mirror.x, mirror.y), mirror.orientation])
  );
}

export function rotateMirror(mirrors, x, y) {
  const key = positionKey(x, y);
  if (!Object.hasOwn(mirrors, key)) return mirrors;
  return { ...mirrors, [key]: mirrors[key] === "/" ? "\\" : "/" };
}

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

/**
 * Trace one light pulse from source until goal, wall, exit, or repeated state.
 * Returns { outcome, path }, where path always includes the source.
 * Each path entry is {x, y, dir}, with dir representing the outgoing direction.
 * The function never mutates a level or mirror state.
 */
export function tracePulse(level, mirrors = createMirrorState(level)) {
  const walls = new Set((level.walls ?? []).map(({ x, y }) => positionKey(x, y)));
  const path = [{ ...level.source }];
  const seen = new Set();
  let { x, y, dir } = level.source;

  // A repeated (position, direction) is a loop in this deterministic simulation.
  for (let step = 0; step <= level.width * level.height * 4; step += 1) {
    const movement = DIRECTIONS[dir];
    const nextX = x + movement.x;
    const nextY = y + movement.y;
    if (nextX < 0 || nextX >= level.width || nextY < 0 || nextY >= level.height) {
      return { outcome: "escaped", path };
    }

    x = nextX;
    y = nextY;
    const key = positionKey(x, y);

    if (walls.has(key)) {
      path.push({ x, y, dir });
      return { outcome: "blocked", path };
    }
    if (level.goal && x === level.goal.x && y === level.goal.y) {
      path.push({ x, y, dir });
      return { outcome: "won", path };
    }

    if (Object.hasOwn(mirrors, key)) {
      dir = reflect(dir, mirrors[key]);
    }
    path.push({ x, y, dir });
    const signature = key + ":" + dir;
    if (seen.has(signature)) {
      return { outcome: "loop", path };
    }
    seen.add(signature);
  }
  return { outcome: "loop", path };
}
