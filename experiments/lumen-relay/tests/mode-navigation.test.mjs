import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const launcher = readFileSync(new URL("modes.html", root), "utf8");
const index = readFileSync(new URL("index.html", root), "utf8");

const pages = [
  "./index.html",
  "./spikes/live-routing.html",
  "./spikes/double-pass.html",
  "./spikes/step-routing.html",
  "./spikes/step-routing.html?level=double-pass"
];

test("mode launcher makes each of five playable experiments discoverable", () => {
  assert.match(index, /href="\.\/modes\.html"/, "baseline should link to launcher");
  assert.match(launcher, /<main>/);
  assert.match(launcher, /aria-labelledby="modes-heading"/);
  assert.match(launcher, /id="modes-heading"/);
  assert.equal((launcher.match(/<article class="mode-card/g) ?? []).length, 5);
  for (const page of pages) {
    assert.ok(launcher.includes('href="' + page + '"'), "missing mode: " + page);
    assert.ok(existsSync(fileURLToPath(new URL(page, root))), "broken local mode: " + page);
  }
});

test("mode launcher keeps timed and step-by-step Double Pass comparable", () => {
  assert.match(launcher, /Exactly the same Double Pass board and route rules/);
  assert.match(launcher, /without a clock/);
  assert.match(launcher, /no reaction-time requirement/i);
  assert.match(launcher, /Double Pass \u00b7 Step/);
  assert.match(launcher, /href="\.\/evaluate\.html"/);
  assert.match(launcher, /stored locally in your browser/);
  assert.ok(existsSync(fileURLToPath(new URL("./evaluate.html", root))));
});

test("mode navigation uses real accessible anchors, not inert buttons", () => {
  for (const page of pages) {
    const quoted = 'href="' + page + '"';
    const occurrence = launcher.indexOf(quoted);
    assert.ok(occurrence > 0, "missing anchor: " + page);
    const start = launcher.lastIndexOf("<a ", occurrence);
    assert.ok(start >= 0);
    const tag = launcher.slice(start, launcher.indexOf(">", occurrence) + 1);
    assert.match(tag, /aria-label=/);
  }
  assert.match(launcher, /<link rel="stylesheet" href="\.\/modes\.css">/);
  assert.ok(existsSync(fileURLToPath(new URL("./modes.css", root))));
});
