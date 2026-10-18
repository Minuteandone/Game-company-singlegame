# Lumen Relay — live-routing experiments

**Primary live-engine author:** agent-03 (AI agent)  
**Double Pass fixture:** agent-04 (AI agent)  
**Baseline Lumen Relay:** agent-02 (AI agent)  
**Status:** disposable mechanic experiments; the baseline game remains unchanged

These pages test the strongest unresolved question from the Lumen Relay design contract:

> Does the pulse matter more when the player can change the route while it is already moving?

All variants reuse one pure, one-cell-at-a-time live engine. A pulse samples the mirror state that exists when it enters each cell, so between-step rotations can change the actual future route rather than merely changing an animation.

## Run

Serve `experiments/lumen-relay/` over HTTP:

```sh
cd experiments/lumen-relay
python3 -m http.server 8000
```

Then choose a variant:

- `http://localhost:8000/spikes/live-routing.html` — **Relay Window**. Two independent live mirrors and generous deadlines. Useful as the simplest proof that between-step changes alter a moving pulse; intentionally vulnerable to flipping both mirrors immediately.
- `http://localhost:8000/spikes/double-pass.html` — **Double Pass**, by agent-04. The same live mirror is visited twice and needs opposite orientations. A successful run therefore requires a genuine change between visits.
- `http://localhost:8000/spikes/step-routing.html` — **Relay Step**. Player-paced control using the same live engine: the pulse advances only when the player chooses Advance one cell, removing the reaction-time requirement.
- `http://localhost:8000/spikes/double-pass-step.html` — **Double Pass Step**, by agent-02. Identical loop geometry and mirror rules to real-time Double Pass, but manual movement. This isolates the effect of reaction-time pressure without changing the puzzle.

The ordinary `index.html` remains the merged turn-based/precomputed-trace baseline.

## Why four variants?

They separate different questions instead of mixing them together.

### Relay Window — architecture / weak timing control

Tests whether dynamic mirror state can affect an in-flight pulse at all. Because both live mirrors can be fixed immediately after launch, it should **not** be treated as evidence that timing itself is interesting.

### Double Pass — forced timing

Tests whether waiting for a specific between-visits window adds anticipation or meaningful decision-making. Neither static orientation solves the route.

Questions:
- Is the return loop readable?
- Does the timing window feel fair?
- Is one meaningful timed action satisfying, or merely stressful?
- Does the moving pulse now justify becoming a gameplay mechanic rather than feedback?

### Relay Step and Double Pass Step — accessibility controls

Both use deterministic manual advancement instead of a timer. Relay Step uses the simpler Relay Window fixture; Double Pass Step uses the exact same two-visit puzzle as the timed Double Pass page, allowing a controlled comparison of pacing rather than geometry.

Questions:
- Does the logical routing challenge survive when reaction speed is removed?
- Is player-paced stepping clearer than real-time travel?
- If real-time is more exciting, can step mode remain an equivalent accessible control path?

## Implementation notes

- `live-engine.mjs` — pure one-cell transition; reuses baseline reflection geometry.
- `live-level.mjs` — Relay Window fixture.
- `double-pass-level.mjs` — agent-04's same-mirror/two-visit fixture.
- `live-routing.mjs`, `double-pass.mjs`, `step-routing.mjs`, `double-pass-step.mjs` — independent browser control surfaces.
- `../tests/live-routing.test.mjs` and `../tests/double-pass-live-routing.test.mjs` — route/timing semantics.
- `../tests/live-routing-ui.test.mjs` — syntax-checks browser modules.
- `../tests/double-pass-step-ui.test.mjs` — simulated-DOM smoke tests for the actual Double Pass Step browser entry, win/failure/reset/keyboard controls.

The experiments should be judged with `docs/live-routing-evaluation.md`. Automated tests establish correctness, not fun or usability. A Continue / Mutate / Replace decision still requires actual browser/device observations.
