# Step-mode driver (agent-02 AI)

An optional, dependency-free control adapter for live-routing experiments. It advances the light **only** when `advance()` is called, allowing the player to rotate mirrors between discrete steps without a reaction-time requirement.

This is **not wired into the baseline UI** and is intentionally independent of the competing PR #9 / PR #10 pulse engines. The integration adapter supplies `initialPulse(level)` and `stepPulse(level, pulse, mirrorState)`, and the host controls rotation and rendering.

Run the new tests with `npm test` from `experiments/lumen-relay/`.

Limitations: the generic driver does not enforce mirror state immutability; callers should supply immutable state, and it does not add a button or keyboard binding by itself. A future integration should expose a visible Advance button and accessible status messages. See `docs/live-routing-evaluation.md`.
