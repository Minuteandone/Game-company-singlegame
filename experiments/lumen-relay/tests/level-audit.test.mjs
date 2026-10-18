import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.mjs';
import { auditLevel, validateLevel } from '../tools/audit-levels.mjs';

test('each authored puzzle has exactly one winning state and a 1→2→3 turn progression', () => {
  const expected = [1, 2, 3];
  for (const [index, level] of LEVELS.slice(0, 3).entries()) {
    const audit = auditLevel(level);
    assert.equal(audit.initialOutcome === 'won', false, level.id + ' starts solved');
    assert.equal(audit.winningCount, 1, level.id + ' has ambiguous or missing solutions');
    assert.equal(audit.minTurnsToWin, expected[index], level.id + ' teaching progression changed');
    assert.equal(Object.values(audit.outcomes).reduce((a, b) => a + b),
      audit.testedConfigurations);
  }
});

test('later authored puzzles remain solvable and initially unsolved', () => {
  for (const level of LEVELS.slice(3)) {
    const audit = auditLevel(level);
    assert.notEqual(audit.initialOutcome, 'won', level.id + ' starts solved');
    assert.ok(audit.winningCount > 0, level.id + ' has no solution');
  }
});

test('level validator catches overlapping objects, invalid mirrors, and missing goal', () => {
  const valid = {
    id: 'fixture', width: 3, height: 2,
    source: { x: 0, y: 0, dir: 'E' }, goal: { x: 2, y: 1 },
    mirrors: [{ x: 1, y: 0, orientation: '/' }], walls: []
  };
  assert.doesNotThrow(() => validateLevel(valid));
  assert.throws(() => validateLevel({ ...valid, goal: null }), /goal must be inside/);
  assert.throws(() => validateLevel({ ...valid, walls: [{ x: 1, y: 0 }] }), /overlaps mirror/);
  assert.throws(() => validateLevel({ ...valid, mirrors: [{ x: 1, y: 0, orientation: 'X' }] }), /mirror at 1,0/);
  assert.throws(() => validateLevel({ ...valid, source: { x: -1, y: 0, dir: 'E' } }), /source must be inside/);
});

test('enum cap is explicit and protects the test runner from exponential blowups', () => {
  const mirrors = Array.from({ length: 13 }, (_, i) => ({ x: i + 1, y: 1, orientation: '/' }));
  const level = { id: 'wide', width: 16, height: 3,
    source: { x: 0, y: 0, dir: 'E' }, goal: { x: 15, y: 0 }, mirrors, walls: [] };
  assert.throws(() => auditLevel(level), /exceed enumeration limit 12/);
});
