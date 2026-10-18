import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

class FakeClassList {
  constructor(node) { this.node = node; }
  values() { return new Set(this.node.className.split(/\s+/).filter(Boolean)); }
  add(...classes) {
    const values = this.values();
    for (const item of classes) values.add(item);
    this.node.className = [...values].join(" ");
  }
  remove(...classes) {
    const values = this.values();
    for (const item of classes) values.delete(item);
    this.node.className = [...values].join(" ");
  }
  contains(item) { return this.values().has(item); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.disabled = false;
    this.textContent = "";
    this.listeners = new Map();
    this.attributes = new Map();
  }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  addEventListener(event, handler) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }
  emit(event, payload = {}) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }
  click() {
    if (!this.disabled) this.emit("click");
  }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) {
    this.children = children.flatMap(child =>
      child.tagName === "FRAGMENT" ? child.children : [child]);
  }
}

const ids = ["board", "begin", "advance", "reset", "hint", "status", "steps", "turns", "visits"];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
const documentListeners = new Map();

globalThis.document = {
  getElementById(id) { return elements[id] ?? null; },
  createElement(tagName) { return new FakeElement(tagName); },
  createDocumentFragment() { return new FakeElement("fragment"); },
  addEventListener(name, handler) { documentListeners.set(name, handler); }
};

// Import the real browser entry, not an independently reimplemented state machine.
// The tiny DOM fake makes button behavior testable using Node's built-in runner.
await import("../spikes/double-pass-step.mjs");

function mirror() {
  return elements.board.children.find(node => node.dataset.key === "4,3");
}

function playUntilEnd() {
  for (let i = 0; i < 60 && !elements.advance.disabled; i++) {
    elements.advance.click();
  }
  assert.equal(elements.advance.disabled, true, "attempt reaches a terminal state");
}

test("HTML exposes a real step button, instructions and timed comparison link", async () => {
  const html = await readFile(new URL("../spikes/double-pass-step.html", import.meta.url), "utf8");
  for (const id of ids) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /double-pass-step\.mjs/);
  assert.match(html, /href="\.\/double-pass\.html"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /no timer/i);
});

test("the entry starts idle and renders accessible orientation and board", () => {
  assert.equal(elements.board.children.length, 35);
  assert.equal(elements.advance.disabled, true);
  assert.equal(mirror().disabled, true);
  assert.match(mirror().getAttribute("aria-label"), /slash orientation/);
  assert.match(mirror().getAttribute("aria-label"), /column 5, row 4/);
  assert.equal(elements.steps.textContent, "0");
});

test("same Double Pass can be solved without timers or reaction speed", () => {
  elements.begin.click();
  assert.equal(elements.advance.disabled, false);
  elements.advance.click();
  elements.advance.click();
  assert.equal(elements.visits.textContent, "1");
  assert.match(elements.status.textContent, /First mirror visit complete/);
  assert.equal(elements.steps.textContent, "2");

  mirror().click();
  assert.match(mirror().getAttribute("aria-label"), /backslash orientation/);
  assert.equal(elements.steps.textContent, "2", "rotation must never move pulse");
  assert.equal(elements.turns.textContent, "1");

  playUntilEnd();
  assert.equal(elements.status.dataset.state, "win");
  assert.equal(elements.visits.textContent, "2");
  assert.equal(mirror().disabled, true);
  assert.equal(elements.begin.disabled, false);
});

test("turning the mirror too early fails, then reset clears all counters", () => {
  elements.begin.click();
  mirror().click();
  playUntilEnd();
  assert.equal(elements.status.dataset.state, "fail");

  elements.reset.click();
  assert.equal(elements.status.dataset.state, "ready");
  assert.equal(elements.steps.textContent, "0");
  assert.equal(elements.turns.textContent, "0");
  assert.equal(elements.visits.textContent, "0");
  assert.match(mirror().getAttribute("aria-label"), /slash orientation/);
  assert.equal(elements.advance.disabled, true);
});

test("a late flip cannot undo the second pass's chosen direction", () => {
  elements.begin.click();
  for (let i = 0; i < 60 && elements.visits.textContent !== "2" && !elements.advance.disabled; i++) {
    elements.advance.click();
  }
  assert.equal(elements.visits.textContent, "2");
  mirror().click();
  playUntilEnd();
  assert.equal(elements.status.dataset.state, "fail");
});

test("keyboard advance and reset remain functional", () => {
  elements.begin.click();
  const keydown = documentListeners.get("keydown");
  assert.equal(typeof keydown, "function");
  let prevented = false;
  keydown({ code: "KeyA", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(elements.steps.textContent, "1");
  keydown({ code: "KeyR", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() {} });
  assert.equal(elements.steps.textContent, "0");
  assert.equal(elements.advance.disabled, true);
});
