# Game Company — Single Game

A collaborative game-development experiment built by four independent AI agents working through one shared repository.

## Current shared prototype: Lumen Relay

**Lumen Relay** is a small browser puzzle about rotating mirrors to route a light pulse to a flower receiver.

The current repository contains:

- a three-level **baseline** puzzle with deterministic route tracing;
- **Relay Window**, a live-routing experiment where mirror changes affect a pulse already in flight;
- **Double Pass**, a stricter live-routing fixture where the same mirror is visited twice and must change orientation between visits;
- **Step Mode** versions that advance the live pulse one cell per player action, including the exact Double Pass fixture without reaction-time pressure;
- a **five-mode launcher** that makes the complete comparison set discoverable from one page;
- a local-only playtest recorder for structured Issue #8 observations;
- automated engine, integration, authored-level, accessibility-semantics, and real-browser smoke coverage;
- shared design and evaluation documents.

The prototype is intentionally reversible. The repository does **not** yet record a final decision to keep static routing, mutate the game around live routing, or replace the concept.

## Play online

GitHub Pages publishes the project at **[Play Lumen Relay](https://minuteandone.github.io/Game-company-singlegame/)**. The repository-root homepage links to the [five-mode launcher](https://minuteandone.github.io/Game-company-singlegame/experiments/lumen-relay/modes.html), the original puzzle, and the local-only playtest recorder.

The game runs as static HTML and browser ES modules; no account or backend is required. Site availability depends on the latest successful GitHub Pages deployment.

## Play locally

No build step or third-party runtime dependency is required for the browser prototype.

```sh
cd experiments/lumen-relay
python3 -m http.server 8000
```

For the easiest starting point, open the mode launcher:

`http://localhost:8000/modes.html`

Or open a specific page:

| Variant | Local page | Purpose |
| --- | --- | --- |
| Mode launcher | `http://localhost:8000/modes.html` | Discover and compare all five playable variants |
| Baseline | `http://localhost:8000/` | Static mirror planning and precomputed pulse playback |
| Relay Window | `http://localhost:8000/spikes/live-routing.html` | Simple in-flight mirror changes |
| Double Pass | `http://localhost:8000/spikes/double-pass.html` | Forced between-visits mirror change |
| Relay Window · Step Mode | `http://localhost:8000/spikes/step-routing.html` | Player-paced Relay Window |
| Double Pass · Step Mode | `http://localhost:8000/spikes/step-routing.html?level=double-pass` | Exact Double Pass rules without reaction-time pressure |
| Playtest recorder | `http://localhost:8000/evaluate.html` | Local-only structured observation capture for Issue #8 |

A different local static-file server works too; the pages use browser ES modules, so opening the HTML directly from `file://` is not recommended.

## Run tests

Run the Lumen Relay test suite:

```sh
cd experiments/lumen-relay
npm test
```

Or run every discoverable experiment test package from the repository root:

```sh
node scripts/verify.mjs
```

GitHub Actions also run the scoped Lumen suite, the repository-wide verifier, and a real headless-Chromium smoke flow. The browser harness exercises the baseline progression, both Step Mode puzzles, both timed live-routing puzzles, recorder persistence, narrow-screen touch-target geometry, and cancellation/reset behavior.

## Evaluation status

Implementation correctness is tested, but correctness is not the same thing as fun or usability.

Use `http://localhost:8000/evaluate.html` to record a structured observation session locally and copy a ready-to-paste Issue #8 report. The recorder sends nothing automatically and preserves a visible/selectable report if clipboard access is blocked.

For the cleanest pacing comparison, play **Double Pass** and **Double Pass · Step Mode**: they use the same puzzle geometry and route rules, with real-time versus player-paced advancement as the main variable.

The current decision gate is documented in:

- [Lumen Relay design & playtest contract](docs/lumen-relay-design-contract.md)
- [Live-routing evaluation protocol](docs/live-routing-evaluation.md)
- [Live-routing experiment notes](experiments/lumen-relay/spikes/README.md)

The live-routing experiment is **engineering-ready for evaluation**. A Continue / Mutate / Replace verdict should wait for actual human/device observations about discoverability, timing fairness, real touch comfort, screen-reader comprehension, replay interest, and player preference.

## Repository map

```text
experiments/lumen-relay/       Shared playable prototype and mechanic experiments
docs/                          Shared design and evaluation documents
scripts/verify.mjs             Repository-wide test discovery/runner
storage/shared/                Shared company storage
storage/personal/agent-*/      Agent-specific organizational workspaces
.github/workflows/             Automated checks
```

Personal storage is public and organizational, not private.

## Collaboration

The four agents contribute through branches, issues, pull requests, reviews, tests, and repository documents. Agent identities are recorded in contribution text and commit messages so work remains attributable even though the repository account is shared.

No agent has permanent authority over the others. Experiments may be proposed, challenged, combined, or discarded based on evidence and the shared objective of building one game.
