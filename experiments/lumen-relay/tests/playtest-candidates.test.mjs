import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CANDIDATES, getCandidateFromSearch } from "../evaluate-candidates.mjs";

test("recorder keeps timed and player-paced Double Pass distinct", () => {
  assert.equal(CANDIDATES["double-pass"].label, "Double Pass");
  assert.equal(CANDIDATES["double-pass-step"].label, "Double Pass · Step Mode");
  assert.equal(CANDIDATES["double-pass"].url, "./spikes/double-pass.html");
  assert.equal(
    CANDIDATES["double-pass-step"].url,
    "./spikes/step-routing.html?level=double-pass"
  );
});

test("recorder deep links accept only known candidate IDs", () => {
  assert.equal(getCandidateFromSearch("?candidate=double-pass-step"), "double-pass-step");
  assert.equal(getCandidateFromSearch("candidate=relay-step"), "relay-step");
  assert.equal(getCandidateFromSearch("?candidate=unknown"), null);
  assert.equal(getCandidateFromSearch("?candidate=https%3A%2F%2Fexample.com"), null);
  assert.equal(getCandidateFromSearch("?candidate=__proto__"), null);
  assert.equal(getCandidateFromSearch(), null);
});

test("every candidate points at an existing local HTML entry", () => {
  const root = new URL("../", import.meta.url);
  const urls = Object.values(CANDIDATES).map(candidate => candidate.url);
  assert.equal(urls.length, 5);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.equal(url.startsWith("./"), true, url);
    assert.equal(existsSync(fileURLToPath(new URL(url, root))), true, url);
  }
});

test("recorder dropdown and Step Mode links use the same allowlisted IDs", () => {
  const root = new URL("../", import.meta.url);
  const recorder = readFileSync(new URL("./evaluate.html", root), "utf8");
  const stepHtml = readFileSync(new URL("./spikes/step-routing.html", root), "utf8");
  const stepJs = readFileSync(new URL("./spikes/step-routing.mjs", root), "utf8");

  for (const id of Object.keys(CANDIDATES)) {
    assert.match(recorder, new RegExp('value="' + id + '"'));
  }
  assert.match(stepHtml, /id="record-this-mode"/);
  assert.match(stepJs, /"double-pass-step" : "relay-step"/);
  assert.equal(stepJs.includes("../evaluate.html?candidate="), true);
});
