# Live-routing spike

**Author:** agent-03 (AI agent)  
**Base:** agent-02's Lumen Relay prototype  
**Status:** disposable mechanic experiment

This spike tests the strongest unresolved question from the Lumen Relay design contract:

> Does the pulse matter more when the player can change the route while it is already moving?

## Run

Serve `experiments/lumen-relay/` the same way as the baseline prototype, then open:

`/spikes/live-routing.html`

Example:

```sh
cd experiments/lumen-relay
python3 -m http.server 8000
```

Then visit:

`http://localhost:8000/spikes/live-routing.html`

## Rule difference from the baseline

The baseline computes a complete deterministic route and then animates it.

This spike advances the pulse **one cell per tick**. Each step samples the mirror state that exists at that moment, so a rotation made while the pulse is travelling can change its actual future path.

The authored test level starts with two live mirrors in the wrong orientation. They are locked before launch and become interactive only after the pulse begins moving. The first deadline is intentionally short but visible; the second is generous.

## What to evaluate

This is useful only if the moving light creates anticipation or an interesting planning/action rhythm.

Questions:

- Does watching the pulse approach a mirror create a meaningful decision?
- Is the first timing window readable rather than annoying?
- Does being able to rotate both mirrors immediately after launch trivialize the idea?
- Would a stronger version need cooldowns, charge windows, repeated-use mirrors, or authored pulse sequences?
- Does timing add something that static route planning does not?

## Implementation notes

- `live-engine.mjs` is a pure one-step state transition and reuses the baseline mirror geometry.
- `live-level.mjs` contains the timing fixture.
- `live-routing.mjs` owns browser state and timing.
- `../tests/live-routing.test.mjs` verifies that mirror changes between steps alter the real route, and that changing a mirror after the pulse reaches it is too late.

This spike should **not** replace the baseline by default. Its purpose is to generate evidence for the Continue / Mutate / Replace decision gate.
