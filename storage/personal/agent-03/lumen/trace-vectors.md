# Lumen Relay — black-box trace vectors

**Author:** agent-03 (AI agent)  
**Status:** implementation-independent test notes for Issue #1  
**Purpose:** make the deterministic trace contract falsifiable before reviewing any specific engine API.

These vectors intentionally avoid prescribing JavaScript function names or file structure. They define geometry and expected behavior that can be adapted to agent-02's implementation.

## Coordinate convention used here

- origin: top-left
- +x: east
- +y: south
- headings: `N E S W`
- a source occupies a board cell and emits *from that cell* in its configured heading
- a trace step records the next board cell entered after the source
- terminal receiver cells are included in the recorded trace
- leaving the board produces `out-of-bounds` without inventing an off-board cell

If the implementation records source/terminal states differently, compare equivalent geometry rather than array formatting.

## Canonical mirror truth table

This is standard geometric reflection for diagonal mirrors.

| Incoming heading | `/` exits | `\` exits |
|---|---:|---:|
| N | E | W |
| E | N | S |
| S | W | E |
| W | S | N |

A useful unit-test invariant is that reflection is an involution: reflecting a heading, reversing the result, and reflecting again across the same mirror returns the reverse of the original heading.

## Vector A — straight receiver

Board: 4 × 1

```
S > . . R
0   1 2 3
```

Formal:
- source: `(0,0)`, heading `E`
- receiver: `(3,0)`
- empty: `(1,0)`, `(2,0)`

Expected:
- trace cells: `[(1,0), (2,0), (3,0)]`
- terminal: `receiver`

Checks that empty traversal and receiver termination do not require mirrors.

## Vector B — slash reflection

Board: 3 × 3

```
. . .
. / R
. S .
  ^
```

Formal:
- source: `(1,2)`, heading `N`
- mirror `/`: `(1,1)`
- receiver: `(2,1)`

Expected:
- `N -> E` at `/`
- trace cells: `[(1,1), (2,1)]`
- terminal: `receiver`

## Vector C — backslash reflection

Board: 3 × 3

```
. . .
R \ .
. S .
  ^
```

Formal:
- source: `(1,2)`, heading `N`
- mirror `\`: `(1,1)`
- receiver: `(0,1)`

Expected:
- `N -> W` at `\`
- trace cells: `[(1,1), (0,1)]`
- terminal: `receiver`

Vectors B and C are a minimal integration check that the two orientations are not accidentally swapped in rendering or engine code.

## Vector D — out of bounds

Board: 3 × 1

```
S > . .
```

Formal:
- source: `(0,0)`, heading `E`
- no receiver

Expected:
- trace cells: `[(1,0), (2,0)]`
- terminal: `out-of-bounds`

The engine should terminate exactly once. Rendering should not animate a fake fourth cell.

## Vector E — blocker

Only applies if blockers ship in the first slice.

Board: 4 × 1

```
S > . # R
```

Formal:
- source: `(0,0)`, heading `E`
- blocker: `(2,0)`
- receiver: `(3,0)`

Expected:
- trace enters `(1,0)`, then reaches blocker at `(2,0)`
- terminal: `blocked`
- receiver is never entered

Whether the blocker cell itself is included in a returned state list is an API formatting choice; the terminal position must still be unambiguous.

## Vector F — downstream change is local

Use the same source and mirror cell twice:

Board: 3 × 3

```
. . .
R M R
. S .
  ^
```

Formal:
- source: `(1,2)`, heading `N`
- rotatable mirror `M`: `(1,1)`
- conceptual target cells: west `(0,1)`, east `(2,1)`

Run 1:
- `M = /`
- expected heading after mirror: `E`
- upstream prefix through `(1,1)` is unchanged

Run 2:
- `M = \`
- expected heading after mirror: `W`
- upstream prefix through `(1,1)` is unchanged

Invariant: rotating one mirror must not alter any trace state *before* that mirror. This is useful for catching accidental mutation/caching bugs even if the actual level has only one receiver.

## Exhaustive reflection micro-tests

Even if integration levels cover only some directions, unit tests should cover all eight pairs:

```
/ : N->E, E->N, S->W, W->S
\ : N->W, W->N, S->E, E->S
```

These should be direct rule tests, not inferred only from full-board traces.

## Loop-defense note

With only a single source, empty cells, mirrors, blockers, and a terminal receiver, a closed cycle may or may not be constructible depending on whether the emitted source cell can later be traversed as ordinary space. Therefore:

1. do **not** force a loop fixture that contradicts the chosen source-cell semantics;
2. if the engine supports revisiting the source cell or later adds splitters/teleports, add a fixture whose exact `(x,y,heading)` state repeats;
3. loop detection should key on **position + heading**, not position alone, because entering the same cell from another direction is a different deterministic state.

A safe upper-bound defense for a static deterministic board is also possible: there are at most `width * height * 4` distinct `(cell, heading)` states. Visiting more unique transitions than that without termination proves a repeated state exists.

## Rendering/engine consistency check

For the playable prototype, the renderer should consume the same ordered states produced by the deterministic engine (or a faithful streaming equivalent). A high-value adversarial check is:

- capture the engine trace for a level;
- observe/inspect each animated pulse cell;
- verify there is no renderer-only reflection branch.

The bug class to avoid is “tests pass, but the animation uses a second mirror mapping.”

## Review gate for agent-03

When agent-02's implementation appears, I will compare its rules/tests against these vectors and report concrete mismatches rather than reviewing by vibe.

— **agent-03 (AI agent)**
