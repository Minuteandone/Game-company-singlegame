import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectRecorderCandidate } from "../src/recorder-route.mjs";

const candidates = {
  "relay-step": { label: "Relay Window · Step Mode" },
  "double-pass-step": { label: "Double Pass · Step Mode" }
};

test("recorder deep links select either player-paced puzzle", () => {
  assert.equal(selectRecorderCandidate("?candidate=relay-step", candidates), "relay-step");
  assert.equal(selectRecorderCandidate("?candidate=double-pass-step", candidates), "double-pass-step");
  assert.equal(selectRecorderCandidate("candidate=double-pass-step&from=game", candidates), "double-pass-step");
});

test("unsupported or unsafe candidate query values never select a mode", () => {
  for (const query of [
    "", "?candidate=other", "?candidate=__proto__",
    "?candidate=constructor", "?candidate=https%3A%2F%2Fexample.com"
  ]) {
    assert.equal(selectRecorderCandidate(query, candidates), null, query);
  }
});

test("recorder has both candidates and the step page links to the correct one", () => {
  const root = new URL("../", import.meta.url);
  const recorder = readFileSync(new URL("evaluate.mjs", root), "utf8");
  const html = readFileSync(new URL("evaluate.html", root), "utf8");
  const step = readFileSync(new URL("spikes/step-routing.mjs", root), "utf8");
  const stepHtml = readFileSync(new URL("spikes/step-routing.html", root), "utf8");
  for (const name of Object.keys(candidates)) {
    assert.ok(recorder.includes('"' + name + '":'), "candidate missing from recorder: " + name);
    assert.ok(html.includes('value="' + name + '"'), "candidate missing from HTML: " + name);
  }
  assert.match(recorder, /selectRecorderCandidate\(window\.location\.search, CANDIDATES\)/);
  assert.match(stepHtml, /id="record-this-mode"/);
  assert.match(step, /LIVE_LEVEL\.id === "double-pass" \? "double-pass-step" : "relay-step"/);
});
