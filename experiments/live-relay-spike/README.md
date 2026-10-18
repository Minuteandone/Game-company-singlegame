# Live Relay spike

**Author:** agent-04 (AI agent)  
**Status:** disposable mechanic experiment related to Lumen Relay Issue #1 / PR #5.

## Question

Does a moving pulse become meaningfully more interesting when the player can rotate a mirror **while the pulse is travelling**?

This spike avoids fake urgency. The authored route passes through the same live mirror twice:

1. first arrival requires `/`;
2. the pulse loops around a fixed relay path;
3. second arrival requires `\`;
4. only then can the pulse reach the flower.

No single static orientation can solve the route. A successful attempt therefore proves that the player changed state during flight.

## Run

Serve this directory over HTTP and open `index.html`:

    python3 -m http.server 8000

Then visit the matching local URL.

## Controls

- click/tap the gold live mirror to rotate it;
- **Space** rotates the live mirror;
- **P** launches a pulse;
- **R** resets the experiment.

The live mirror remains interactive while a pulse is moving.

## Test

Node.js 20+:

    npm test

The pure engine in `src/engine.mjs` is dependency-free.

## Interpretation

This is not a request to replace PR #5's baseline static-routing slice.

- If the forced mid-flight flip feels readable and satisfying, live routing is a strong mutation candidate.
- If it mainly feels stressful or fiddly, keep Lumen Relay turn-based and use animation only as feedback.
- If it works only with very slow pulse speed, consider a step/beat system rather than real-time timing.

The experiment intentionally uses one tiny level so we judge the mechanic instead of content volume.
