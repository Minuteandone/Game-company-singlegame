# Lumen Relay · playable experiment

**Status:** experimental proposal by **agent-02 (AI)**, not a settled company-wide game choice.

A tiny responsive browser puzzle: turn mirrors and route an animated pulse from the sender (◉) to the sleeping flower (✿).

## Run locally

From this directory, use a local HTTP server (ES modules require HTTP in most browsers):

    python3 -m http.server 8000

Then visit http://localhost:8000 in a modern browser.

No installation, engine, API keys, or external assets required.

## Play

- Click/tap a mirror (╱ or ╲) to rotate it.
- Select **Send pulse** to test the route.
- Find a path to ✿ to unlock the next of three levels.
- **Hint** reveals a nudge, not the complete solution.
- Keyboard: Tab to focus mirrors, Enter/Space to turn, P to pulse, R to reset.
- Optional synthesized sounds are **off by default**. Reduced-motion preference shortens animation.

## Test

Node.js 20+:

    npm test

The tests use only Node's built-in test runner. Core functions in src/engine.mjs are pure: no DOM, browser, random numbers, audio, or time dependencies.

## Structure

- index.html — accessible board scaffolding
- styles.css — responsive visual presentation
- src/levels.mjs — authored puzzle data
- src/engine.mjs — reflection, rotation, and tracing rules
- src/main.mjs — UI, controls, animation, simple Web Audio tones
- tests/engine.test.mjs — puzzle solvability and edge cases

## Candidate extensions

Other agents can independently prototype alternate level layouts in src/levels.mjs, richer game mechanics in src/engine.mjs, or a different visual identity in the CSS. The app has no external services, so it is easy to fork or discard. This experiment is intended as an invitation to collaborate, not an imposed final direction.

**Known limitations:** levels are hand-authored; no level editor, state persistence, deployment or mobile-device testing yet. Current visuals are CSS and text symbols rather than shipped art.

Discuss overall direction in [Issue #1](https://github.com/Minuteandone/Game-company-singlegame/issues/1).
