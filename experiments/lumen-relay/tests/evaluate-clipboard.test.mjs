import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.value = "";
    this.textContent = "";
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.focusCount = 0;
    this.selectCount = 0;
  }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  addEventListener(event, handler) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), handler]);
  }
  async click() {
    for (const handler of this.listeners.get("click") ?? []) await handler();
  }
  appendChild(child) { this.children.push(child); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { this.focusCount++; }
  select() { this.selectCount++; }
  remove() {}
}

const fieldIds = [
  "candidate", "device", "input", "viewport", "motion", "result",
  "discoverability", "causal", "movement", "fairness", "accessibility",
  "replay", "notes", "verdict"
];
const otherIds = [
  "open-candidate", "save-session", "copy-current", "reset-form",
  "clear-saved", "saved-list", "status",
  "manual-copy-panel", "manual-copy-text", "select-manual-copy"
];
const els = Object.fromEntries([...fieldIds, ...otherIds]
  .map(id => [id, new FakeElement()]));
els["manual-copy-panel"].hidden = true;
els.candidate.value = "double-pass-step";
els.device.value = "desktop/laptop";
els.input.value = "keyboard";
els.viewport.value = "wide";
els.motion.value = "not enabled";
els.result.value = "completed";
els.discoverability.value = "The tester found the mirror without prompting.";
els.verdict.value = "inconclusive";

const saved = new Map();
globalThis.localStorage = {
  getItem(key) { return saved.get(key) ?? null; },
  setItem(key, value) { saved.set(key, value); },
  removeItem(key) { saved.delete(key); }
};
let legacyCopyMode = "false";
globalThis.document = {
  body: new FakeElement("body"),
  getElementById(id) { return els[id] ?? null; },
  createElement(tag) { return new FakeElement(tag); },
  execCommand(command) {
    assert.equal(command, "copy");
    if (legacyCopyMode === "throw") throw new Error("Clipboard denied");
    return legacyCopyMode === "success";
  }
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  writable: true,
  value: { clipboard: { async writeText() { throw new Error("Permission denied"); } } }
});
globalThis.window = { location: { search: "" }, open() {} };
globalThis.confirm = () => false;

await import("../evaluate.mjs");

test("recorder contains a hidden, labelled, read-only manual report area", async () => {
  const html = await readFile(new URL("../evaluate.html", import.meta.url), "utf8");
  assert.match(html, /id="manual-copy-panel"[^>]*hidden/);
  assert.match(html, /id="manual-copy-text"[^>]*readonly/);
  assert.match(html, /id="select-manual-copy"/);
  assert.equal(els["manual-copy-panel"].hidden, true);
});

test("denied browser and legacy copy exposes the complete current report", async () => {
  await els["copy-current"].click();
  assert.equal(els["manual-copy-panel"].hidden, false);
  const text = els["manual-copy-text"].value;
  assert.match(text, /Lumen Relay playtest observation/);
  assert.match(text, /Double Pass/);
  assert.match(text, /tester found the mirror without prompting/);
  assert.match(els.status.textContent, /select and copy/i);
  assert.ok(els["manual-copy-text"].focusCount >= 1);
  assert.ok(els["manual-copy-text"].selectCount >= 1);
  assert.equal(saved.size, 0, "manual fallback does not upload or persist data");
});

test("Select report text refocuses and reselects the visible report", async () => {
  const previous = els["manual-copy-text"].selectCount;
  await els["select-manual-copy"].click();
  assert.equal(els["manual-copy-text"].selectCount, previous + 1);
  assert.match(els.status.textContent, /Report text selected/);
});

test("successful clipboard copy hides any previous manual report preview", async () => {
  let copied = "";
  globalThis.navigator.clipboard.writeText = async text => { copied = text; };
  await els["copy-current"].click();
  assert.match(copied, /Lumen Relay playtest observation/);
  assert.equal(els["manual-copy-panel"].hidden, true);
  assert.match(els.status.textContent, /report copied/i);
});

test("unsupported clipboard API and a throwing legacy API still preserve report text", async () => {
  globalThis.navigator.clipboard = undefined;
  legacyCopyMode = "throw";
  els.discoverability.value = "The tester needed a second explanation.";
  await els["copy-current"].click();
  assert.equal(els["manual-copy-panel"].hidden, false);
  assert.match(els["manual-copy-text"].value, /needed a second explanation/);
});

test("copying a saved session uses saved evidence, not the newer form contents", async () => {
  els.discoverability.value = "Saved original observation";
  await els["save-session"].click();
  assert.equal(els["saved-list"].children.length, 1);
  const item = els["saved-list"].children[0];
  const actions = item.children[2];
  assert.equal(actions.children.length, 2);
  els.discoverability.value = "Form changed after saving";
  await actions.children[0].click();
  assert.equal(els["manual-copy-panel"].hidden, false);
  assert.match(els["manual-copy-text"].value, /Saved original observation/);
  assert.doesNotMatch(els["manual-copy-text"].value, /Form changed after saving/);
});
