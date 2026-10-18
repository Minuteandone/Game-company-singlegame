import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Tiny DOM simulation calling the real baseline browser entry module. */
class FakeClassList {
  constructor(owner) { this.owner = owner; }
  all() { return new Set(this.owner.className.split(/\s+/).filter(Boolean)); }
  add(...names) {
    const next = this.all();
    names.forEach(name => next.add(name));
    this.owner.className = [...next].join(" ");
  }
  remove(...names) {
    const next = this.all();
    names.forEach(name => next.delete(name));
    this.owner.className = [...next].join(" ");
  }
}
class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.classList = new FakeClassList(this);
    this.style = {};
    this.dataset = {};
    this.textContent = "";
    this.children = [];
    this.disabled = false;
    this.hidden = false;
    this.attributes = new Map();
    this.listeners = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  focus() { globalThis.document.activeElement = this; }
  addEventListener(event, handler) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), handler]);
  }
  click() {
    if (this.disabled) return Promise.resolve();
    return Promise.all((this.listeners.get("click") ?? []).map(handler => handler()));
  }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) {
    this.children = children.flatMap(node =>
      node.tagName === "FRAGMENT" ? node.children : [node]);
  }
}

const ids = [
  "board", "chapter", "level-title", "level-subtitle", "shots",
  "turns", "fire", "reset", "undo", "hint", "next", "explore-after-win", "status", "sound"
];
const els = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
const documentListeners = new Map();
globalThis.window = {
  matchMedia() { return { matches: true }; },
  AudioContext: undefined,
  webkitAudioContext: undefined
};
globalThis.document = {
  activeElement: null,
  getElementById(id) { return els[id] ?? null; },
  createElement(name) { return new FakeElement(name); },
  createDocumentFragment() { return new FakeElement("fragment"); },
  addEventListener(name, handler) { documentListeners.set(name, handler); }
};
await import("../src/main.mjs");

const mirror = key => els.board.children.find(tile => tile.dataset.key === key);

test("undo button has an accessible key shortcut and starts disabled", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="undo"[^>]*disabled[^>]*aria-keyshortcuts="U"/);
  assert.match(html, /<kbd>U<\/kbd> to undo/);
  assert.equal(els.undo.disabled, true);
  assert.equal(els.turns.textContent, "0");
  assert.match(mirror("3,3").getAttribute("aria-label"), /backslash orientation/);
});

test("undo reverses a player turn without erasing the shot counter", async () => {
  await mirror("3,3").click();
  assert.equal(els.turns.textContent, "1");
  assert.equal(els.undo.disabled, false);
  assert.match(mirror("3,3").getAttribute("aria-label"), /slash orientation/);
  await els.undo.click();
  assert.equal(els.turns.textContent, "0");
  assert.equal(els.undo.disabled, true);
  assert.equal(els.shots.textContent, "0");
  assert.match(mirror("3,3").getAttribute("aria-label"), /backslash orientation/);
  assert.match(els.status.textContent, /Last turn undone/);
});

test("keyboard U undoes once and ignores auto-repeat", async () => {
  await mirror("3,3").click();
  const keydown = documentListeners.get("keydown");
  assert.equal(typeof keydown, "function");
  keydown({ key: "u", altKey: false, ctrlKey: false, metaKey: false, repeat: true });
  assert.equal(els.turns.textContent, "1");
  keydown({ key: "u", altKey: false, ctrlKey: false, metaKey: false, repeat: false });
  assert.equal(els.turns.textContent, "0");
  assert.equal(els.undo.disabled, true);
});

test("in-flight pulses disable undo and reset clears undo history", async () => {
  await mirror("3,3").click();
  const task = els.fire.click();
  assert.equal(els.undo.disabled, true);
  await els.undo.click();
  assert.equal(els.turns.textContent, "1");
  await els.reset.click();
  assert.equal(els.turns.textContent, "0");
  assert.equal(els.shots.textContent, "0");
  assert.equal(els.undo.disabled, true);
  await task;
  assert.equal(els.status.dataset.state, "ready");
});

test("win locks undo and the next level starts with empty history", async () => {
  await mirror("3,3").click();
  await els.fire.click();
  assert.equal(els.status.dataset.state, "win");
  assert.equal(els.undo.disabled, true);
  assert.equal(els.next.hidden, false);
  await els.next.click();
  assert.equal(els["level-title"].textContent, "The Detour");
  assert.equal(document.activeElement, els["level-title"],
    "Next puzzle should focus its heading after hiding the Next button");
  assert.equal(els.turns.textContent, "0");
  assert.equal(els.undo.disabled, true);
  await mirror("3,5").click();
  await mirror("6,1").click();
  assert.equal(els.turns.textContent, "2");
  await els.undo.click();
  assert.equal(els.turns.textContent, "1");
  assert.match(mirror("6,1").getAttribute("aria-label"), /slash orientation/);
  assert.match(mirror("3,5").getAttribute("aria-label"), /slash orientation/);
});


test("focused Undo button returns focus to the restored mirror", async () => {
  await els.reset.click();
  await mirror("3,5").click();
  const changedMirror = mirror("3,5");
  els.undo.focus();
  assert.strictEqual(document.activeElement, els.undo);
  await els.undo.click();
  assert.strictEqual(document.activeElement, changedMirror);
  assert.equal(els.undo.disabled, true);
  assert.match(changedMirror.getAttribute("aria-label"), /backslash orientation/);
});

test("U shortcut preserves focus on an unrelated control", async () => {
  await mirror("3,5").click();
  els.hint.focus();
  const keydown = documentListeners.get("keydown");
  keydown({ key: "u", altKey: false, ctrlKey: false, metaKey: false, repeat: false });
  assert.strictEqual(document.activeElement, els.hint);
  assert.equal(els.turns.textContent, "0");
});

test("completing all three puzzles and replaying returns focus to First Light", async () => {
  await els.reset.click();
  await mirror("3,5").click();
  await mirror("6,1").click();
  await els.fire.click();
  assert.equal(els.status.dataset.state, "win");
  await els.next.click();
  assert.equal(els["level-title"].textContent, "Crossed Wires");
  assert.strictEqual(document.activeElement, els["level-title"]);
  for (const key of ["2,1", "7,5", "7,2"]) await mirror(key).click();
  await els.fire.click();
  assert.equal(els.status.dataset.state, "win");
  await els.next.click();
  assert.equal(els["level-title"].textContent, "First Light");
  assert.strictEqual(document.activeElement, els["level-title"]);
  assert.equal(els.undo.disabled, true);
  assert.equal(els["explore-after-win"].hidden, true);
});

test("level heading can be focused programmatically without entering normal Tab order", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<h2 id="level-title" tabindex="-1">/);
});
