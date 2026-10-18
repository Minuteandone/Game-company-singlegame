import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const gameRoot = new URL("../", import.meta.url);
const kit = readFileSync(new URL("./playtest.html", gameRoot), "utf8");
const modes = readFileSync(new URL("./modes.html", gameRoot), "utf8");

test("the public playtest guide has a semantic, static, readable page", () => {
  assert.match(kit, /<!doctype html>/i);
  assert.match(kit, /<html lang="en">/);
  assert.match(kit, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(kit, /<main>/);
  assert.match(kit, /id="choose-order"/);
  assert.match(kit, /id="observe"/);
  assert.match(kit, /id="record"/);
  assert.doesNotMatch(kit, /<script\b/i, "playtest guide should have no telemetry or script");
  assert.match(kit, /No winner has been chosen/);
  assert.match(kit, /only in this browser/);
});

test("timed-first and step-first comparisons use the exact shared puzzle URLs", () => {
  const firstA = kit.indexOf('id="timed-first"');
  const firstB = kit.indexOf('id="step-first"');
  assert.ok(firstA > 0 && firstB > firstA);
  const orderA = kit.slice(firstA, firstB);
  const orderB = kit.slice(firstB, kit.indexOf('<section class="focus-panel"', firstB));
  const timed = 'href="./spikes/double-pass.html"';
  const stepped = 'href="./spikes/step-routing.html?level=double-pass"';
  const recordTimed = 'href="./evaluate.html?candidate=double-pass"';
  const recordStepped = 'href="./evaluate.html?candidate=double-pass-step"';
  for (const link of [timed, stepped, recordTimed, recordStepped]) {
    assert.ok(orderA.includes(link), "A missing " + link);
    assert.ok(orderB.includes(link), "B missing " + link);
  }
  assert.ok(orderA.indexOf(timed) < orderA.indexOf(stepped), "A must start timed");
  assert.ok(orderB.indexOf(stepped) < orderB.indexOf(timed), "B must start stepped");
  assert.ok(orderA.indexOf(recordTimed) < orderA.indexOf(stepped), "record first attempt before second");
  assert.ok(orderB.indexOf(recordStepped) < orderB.indexOf(timed), "record first attempt before second");
});

test("local playtest links resolve to real checked-in pages and documents", () => {
  const localLinks = [...kit.matchAll(/href="([^"]+)"/g)].map(m => m[1])
    .filter(href => href.startsWith("./") || href.startsWith("../"));
  assert.ok(localLinks.length >= 10, "guide must link both game modes and evidence recorder");
  for (const href of localLinks) {
    const target = new URL(href, new URL("./playtest.html", gameRoot));
    assert.equal(target.protocol, "file:");
    assert.ok(existsSync(fileURLToPath(target)), "Missing local target: " + href);
  }
});

test("the five-mode launcher exposes the comparison guide without replacing its recorder", () => {
  assert.match(modes, /href="\.\/playtest\.html"/);
  assert.match(modes, /href="\.\/evaluate\.html"/);
  assert.match(modes, /aria-label="Follow the matched Double Pass playtest guide"/);
  const styles = readFileSync(new URL("./modes.css", gameRoot), "utf8");
  assert.match(styles, /\.mode-evaluation-links/);
  assert.match(styles, /min-height:48px/);
});

test("the guide asks for real, non-identifying observations and preserves the decision gate", () => {
  assert.match(kit, /avoid including identifying information or private details/);
  assert.match(kit, /Attempted, not completed/);
  assert.match(kit, /alternate between Sequence A and Sequence B/);
  assert.match(kit, /before reading its hint/i);
  assert.match(kit, /https:\/\/github\.com\/Minuteandone\/Game-company-singlegame\/issues\/8/);
  assert.doesNotMatch(kit, /(?<!No )(?:we have chosen|the winner is|results show that)/i);
});
