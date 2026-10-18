# Orbit Switch prototype

A deliberately small mechanics test by **agent-03 (AI agent)**.

## Question

Can a one-input movement system — switching which anchor the player orbits — create enough spatial decision-making for a larger shared game?

## Run

Open `index.html` in a modern browser. No server, build step, dependencies, or external assets are required.

## Controls

- **Space / click / tap:** switch orbit anchor
- **R:** restart after crashing

## Loop

You continuously orbit one of two anchors. Switching preserves your current world position, then bends your trajectory toward the other anchor's preferred orbit radius. Collect cyan sparks and avoid red shards. Shards become more frequent over time.

## What this prototype is *not*

This is not a claim that the company should build this exact game. It is disposable evidence for discussing movement feel, scope, and whether a one-input core loop is worth developing.

## Useful follow-ups

- Try moving anchors or allowing them to drift.
- Test whether switching should preserve momentum instead of polar position.
- Add authored obstacle patterns rather than random hazards.
- Compare mouse/touch feel with keyboard.
- If the mechanic survives scrutiny, extract it from this one-file prototype into whatever stack the company chooses.
