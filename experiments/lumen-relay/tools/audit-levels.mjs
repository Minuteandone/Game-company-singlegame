/**
 * [agent-01 | AI] Exhaustively inspect small mirror-routing levels.
 *
 * Run: node tools/audit-levels.mjs
 * This is an authoring/test utility, not gameplay code. The actual game engine
 * determines the outcome of every enumerated configuration.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createMirrorState, positionKey, tracePulse } from '../src/engine.mjs';
import { LEVELS } from '../src/levels.mjs';

const HEADINGS = new Set(['N', 'E', 'S', 'W']);
const ORIENTATIONS = new Set(['/', '\\']);
const OUTCOMES = ['won', 'escaped', 'blocked', 'loop'];

export function validateLevel(level) {
  const id = level?.id ?? '<unnamed level>';
  const fail = message => { throw new Error(`${id}: ${message}`); };
  if (!Number.isSafeInteger(level?.width) || level.width <= 0 ||
      !Number.isSafeInteger(level?.height) || level.height <= 0) {
    fail('width and height must be positive integers');
  }

  const inBounds = ({ x, y }) => Number.isSafeInteger(x) && Number.isSafeInteger(y) &&
    x >= 0 && y >= 0 && x < level.width && y < level.height;
  for (const [name, point] of [['source', level.source], ['goal', level.goal]]) {
    if (!point || !inBounds(point)) fail(`${name} must be inside the board`);
  }
  if (!HEADINGS.has(level.source.dir)) fail('source.dir must be N, E, S, or W');

  const occupied = new Map();
  for (const [kind, points] of [['source', [level.source]], ['goal', [level.goal]],
                                ['mirror', level.mirrors ?? []], ['wall', level.walls ?? []]]) {
    if (!Array.isArray(points)) fail(`${kind} list must be an array`);
    for (const point of points) {
      if (!point || !inBounds(point)) fail(`${kind} is outside the board`);
      const key = positionKey(point.x, point.y);
      if (occupied.has(key)) fail(`${kind} overlaps ${occupied.get(key)} at ${key}`);
      occupied.set(key, kind);
      if (kind === 'mirror' && !ORIENTATIONS.has(point.orientation)) {
        fail(`mirror at ${key} must be / or \\`);
      }
    }
  }
}

/**
 * Returns the exact solution count and minimum number of initial-state toggles.
 * Caps enumeration to keep accidental large inputs from blocking local/CI runs.
 */
export function auditLevel(level, { maxMirrors = 12 } = {}) {
  validateLevel(level);
  if (!Number.isSafeInteger(maxMirrors) || maxMirrors < 0 || maxMirrors > 20) {
    throw new Error('maxMirrors must be an integer from 0 to 20');
  }
  const mirrors = level.mirrors ?? [];
  if (mirrors.length > maxMirrors) {
    throw new Error(`${level.id}: ${mirrors.length} mirrors exceed enumeration limit ${maxMirrors}`);
  }

  const original = createMirrorState(level);
  const keys = mirrors.map(({ x, y }) => positionKey(x, y));
  const testedConfigurations = 2 ** keys.length;
  let winningCount = 0;
  let minTurnsToWin = null;
  let exampleSolution = null;
  const outcomes = Object.fromEntries(OUTCOMES.map(outcome => [outcome, 0]));

  for (let mask = 0; mask < testedConfigurations; mask += 1) {
    const orientations = { ...original };
    const flipped = [];
    for (let i = 0; i < keys.length; i += 1) {
      if (mask & (2 ** i)) {
        const key = keys[i];
        orientations[key] = orientations[key] === '/' ? '\\' : '/';
        flipped.push(key);
      }
    }
    const outcome = tracePulse(level, orientations).outcome;
    if (!Object.hasOwn(outcomes, outcome)) {
      throw new Error(`${level.id}: unexpected engine outcome ${outcome}`);
    }
    outcomes[outcome] += 1;
    if (outcome === 'won') {
      winningCount += 1;
      if (minTurnsToWin === null || flipped.length < minTurnsToWin) {
        minTurnsToWin = flipped.length;
        exampleSolution = { flippedKeys: flipped, orientations };
      }
    }
  }
  return {
    id: level.id, mirrorCount: mirrors.length, testedConfigurations,
    initialOutcome: tracePulse(level, original).outcome,
    winningCount, minTurnsToWin, exampleSolution, outcomes
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let bad = false;
  for (const level of LEVELS) {
    try {
      const audit = auditLevel(level);
      const turns = audit.minTurnsToWin === null ? 'impossible' : audit.minTurnsToWin;
      console.log(`${audit.id}: ${audit.winningCount}/${audit.testedConfigurations} winning states; ` +
                  `minimum ${turns} turns; initial ${audit.initialOutcome}`);
      if (!audit.winningCount || audit.initialOutcome === 'won') bad = true;
    } catch (error) {
      console.error(error.message);
      bad = true;
    }
  }
  if (bad) process.exitCode = 1;
}
