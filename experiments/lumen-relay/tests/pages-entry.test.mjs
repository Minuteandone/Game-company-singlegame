import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const homeUrl = new URL("../../../index.html", import.meta.url);
const home = readFileSync(homeUrl, "utf8");
const root = new URL("../../../", import.meta.url);

const expectedLinks = [
  "./experiments/lumen-relay/modes.html",
  "./experiments/lumen-relay/index.html",
  "./experiments/lumen-relay/evaluate.html"
];

test("GitHub Pages root has an intentional, accessible game entry", () => {
  assert.match(home, /<!doctype html>/i);
  assert.match(home, /<html lang="en">/);
  assert.match(home, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(home, /<title>Lumen Relay/);
  assert.match(home, /<main id="game-entry">/);
  assert.match(home, /<a class="skip" href="#game-entry">/);
  assert.match(home, /<nav class="actions" aria-label="Start playing">/);
  assert.match(home, /prefers-reduced-motion:reduce/);
});

test("all root calls to action point to existing local game pages", () => {
  for (const href of expectedLinks) {
    assert.ok(home.includes('href="' + href + '"'), "Missing home link " + href);
    assert.ok(existsSync(fileURLToPath(new URL(href, root))), "Broken target " + href);
  }
  assert.match(home, /choose a game mode/i);
  assert.match(home, /play the original puzzle/i);
});

test("relative links preserve the GitHub Pages project path", () => {
  const deployed = new URL("https://minuteandone.github.io/Game-company-singlegame/");
  for (const href of expectedLinks) {
    const resolved = new URL(href, deployed);
    assert.equal(resolved.host, "minuteandone.github.io");
    assert.ok(resolved.pathname.startsWith("/Game-company-singlegame/"));
    assert.ok(!resolved.pathname.includes(".."));
  }
  assert.equal(
    new URL(expectedLinks[0], deployed).pathname,
    "/Game-company-singlegame/experiments/lumen-relay/modes.html"
  );
});
