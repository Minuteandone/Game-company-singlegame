import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Test the real player-facing Relay Step entry module, not a recreated UI state
 * machine. A minimal DOM fake supports the browser calls this module uses.
 * This remains a Node interaction smoke test, not a real browser/AT playtest.
 */
class ClassList {
  constructor(node) { this.node = node; }
  values() { return new Set(this.node.className.split(/\s+/).filter(Boolean)); }
  add(...names) {
    const values = this.values();
    names.forEach(name => values.add(name));
    this.node.className = [...values].join(" ");
  }
  remove(...names) {
    const values = this.values();
    names.forEach(name => values.delete(name));
    this.node.className = [...values].join(" ");
  }
  contains(name) { return this.values().has(name); }
}

class Element {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.classList = new ClassList(this);
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.disabled = false;
    this.textContent = "";
    this.attributes = new Map();
    this.listeners = new Map();
  }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  focus() { globalThis.document.activeElement = this; }
  addEventListener(name, callback) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), callback]);
  }
  emit(name, event = {}) {
    (this.listeners.get(name) ?? []).forEach(callback => callback(event));
  }
  click() { if (!this.disabled) this.emit("click"); }
  appendChild(node) { this.children.push(node); }
  replaceChildren(...nodes) {
    this.children = nodes.flatMap(node =>
      node.tagName === "FRAGMENT" ? node.children : [node]);
  }
}

const ids = [
  "board", "begin", "advance", "reset", "hint", "status",
  "steps", "turns", "level-title", "level-subtitle", "timed-variant", "record-this-mode",
  "record-this-mode"
];
const els = Object.fromEntries(ids.map(id => [id, new Element()]));
const links = [
  Object.assign(new Element("a"), { dataset: { stepLevel: "relay-window" } }),
  Object.assign(new Element("a"), { dataset: { stepLevel: "double-pass" } })
];
const documentEvents = new Map();
globalThis.window = { location: { search: "?level=double-pass" } };
globalThis.document = {
  title: "",
  activeElement: null,
  getElementById(id) { return els[id] ?? null; },
  querySelectorAll(selector) { return selector === "[data-step-level]" ? links : []; },
  createElement(tag) { return new Element(tag); },
  createDocumentFragment() { return new Element("fragment"); },
  addEventListener(name, callback) { documentEvents.set(name, callback); }
};

await import("../spikes/step-routing.mjs");

const liveMirror = () => els.board.children.find(tile => tile.dataset.key === "4,3");
const advanceUntilComplete = () => {
  for (let i = 0; i < 65 && !els.advance.disabled; i++) els.advance.click();
  assert.equal(els.advance.disabled, true, "the run must terminate");
};

test("selected Double Pass fixture is visible and linked to its timed comparison", async () => {
  const html = await readFile(new URL("../spikes/step-routing.html", import.meta.url), "utf8");
  assert.match(html, /step-routing\.html\?level=double-pass/);
  assert.match(html, /id="advance"/);
  assert.match(html, /aria-live="polite"/);
  assert.equal(els["level-title"].textContent, "Double Pass");
  assert.match(document.title, /Double Pass/);
  assert.equal(links[1].getAttribute("aria-current"), "page");
  assert.equal(links[0].getAttribute("aria-current"), null);
  assert.match(els["timed-variant"].getAttribute("href"), /double-pass\.html/);
});

test("Double Pass loads idle, with orientation available in the control name", () => {
  assert.equal(els.board.children.length, 35);
  assert.equal(els.advance.disabled, true);
  assert.equal(liveMirror().disabled, true);
  assert.match(liveMirror().getAttribute("aria-label"), /slash orientation/);
  assert.match(liveMirror().getAttribute("aria-label"), /column 5, row 4/);
  assert.equal(els.steps.textContent, "0");
});

test("a flip after the first visit wins through real button interactions", () => {
  els.begin.click();
  assert.equal(els.advance.disabled, false);
  els.advance.click();
  els.advance.click();
  assert.equal(els.steps.textContent, "2");
  assert.equal(liveMirror().classList.contains("current"), true);
  assert.match(els.status.textContent, /First pass complete/);

  liveMirror().click();
  assert.match(liveMirror().getAttribute("aria-label"), /backslash orientation/);
  assert.equal(els.steps.textContent, "2", "rotation must not advance pulse");
  assert.equal(els.turns.textContent, "1");
  advanceUntilComplete();
  assert.equal(els.status.dataset.state, "win");
  assert.equal(liveMirror().disabled, true);
});

test("flipping before the first visit fails and reset restores pristine state", () => {
  els.begin.click();
  liveMirror().click();
  advanceUntilComplete();
  assert.equal(els.status.dataset.state, "fail");
  els.reset.click();
  assert.equal(els.status.dataset.state, "ready");
  assert.equal(els.steps.textContent, "0");
  assert.equal(els.turns.textContent, "0");
  assert.match(liveMirror().getAttribute("aria-label"), /slash orientation/);
  assert.equal(els.advance.disabled, true);
});

test("after the second visit, changing orientation cannot rewrite the route", () => {
  els.begin.click();
  let visits = 0;
  for (let step = 0; step < 65 && !els.advance.disabled; step++) {
    els.advance.click();
    if (liveMirror().classList.contains("current")) visits++;
    if (visits === 2) break;
  }
  assert.equal(visits, 2, "must revisit same mirror");
  liveMirror().click();
  advanceUntilComplete();
  assert.equal(els.status.dataset.state, "fail");
});

test("keyboard A advances one cell and R resets", () => {
  els.begin.click();
  const keydown = documentEvents.get("keydown");
  assert.equal(typeof keydown, "function");
  let prevented = false;
  keydown({ code: "KeyA", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(els.steps.textContent, "1");
  keydown({ code: "KeyR", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() {} });
  assert.equal(els.steps.textContent, "0");
  assert.equal(els.advance.disabled, true);
});


test("focused Begin hands keyboard control to enabled Advance", () => {
  els.reset.click();
  els.begin.focus();
  els.begin.click();
  assert.equal(els.begin.disabled, true);
  assert.equal(els.advance.disabled, false);
  assert.strictEqual(document.activeElement, els.advance);
});

test("Reset from a focused Advance moves focus to usable Begin", () => {
  els.advance.focus();
  els.advance.click();
  assert.equal(els.steps.textContent, "1");
  els.reset.click();
  assert.equal(els.advance.disabled, true);
  assert.equal(els.begin.disabled, false);
  assert.strictEqual(document.activeElement, els.begin);
});

test("R shortcut from a focused mirror survives board replacement", () => {
  els.begin.click();
  const focusedMirror = liveMirror();
  focusedMirror.focus();
  assert.strictEqual(document.activeElement, focusedMirror);
  documentEvents.get("keydown")({
    code: "KeyR", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() {}
  });
  assert.equal(els.advance.disabled, true);
  assert.equal(els.begin.disabled, false);
  assert.strictEqual(document.activeElement, els.begin);
});

test("terminal Advance focus moves to newly available Begin new run", () => {
  els.begin.focus();
  els.begin.click();
  els.advance.focus();
  advanceUntilComplete();
  assert.equal(els.advance.disabled, true);
  assert.equal(els.begin.disabled, false);
  assert.strictEqual(document.activeElement, els.begin);
  assert.match(els.begin.textContent, /Begin new step run/);
});

test("A shortcut changes the pulse without stealing focus from Hint", () => {
  els.begin.click();
  els.hint.focus();
  const stepBefore = Number(els.steps.textContent);
  documentEvents.get("keydown")({
    code: "KeyA", altKey: false, ctrlKey: false, metaKey: false, repeat: false,
    preventDefault() {}
  });
  assert.strictEqual(document.activeElement, els.hint);
  assert.equal(Number(els.steps.textContent), stepBefore + 1);
});
