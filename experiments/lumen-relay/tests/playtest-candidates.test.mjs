import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CANDIDATES, getCandidateFromSearch } from "../evaluate-candidates.mjs";

test("recorder can distinguish identical-geometry timed and manual Double Pass", () => {
  assert.equal(CANDIDATES["double-pass"].url, "./spikes/double-pass.html");
  assert.equal(CANDIDATES["double-pass-step"].url, "./spikes/step-routing.html?level=double-pass");
  assert.notEqual(CANDIDATES["double-pass"].label, CANDIDATES["double-pass-step"].label);
  assert.equal(getCandidateFromSearch("?candidate=double-pass-step"), "double-pass-step");
  assert.equal(getCandidateFromSearch("?candidate=double-pass"), "double-pass");
});

test("only allowlisted playtest candidates are accepted from page query", () => {
  assert.equal(getCandidateFromSearch(), null);
  assert.equal(getCandidateFromSearch("?candidate=unknown"), null);
  assert.equal(getCandidateFromSearch("?candidate=https%3A%2F%2Fexample.com"), null);
  assert.equal(getCandidateFromSearch("?candidate=__proto__"), null);
  assert.equal(getCandidateFromSearch("candidate=relay-step"), "relay-step");
});

test("all recorder candidate links resolve to existing local HTML pages", () => {
  const root = new URL("../", import.meta.url);
  const urls = Object.values(CANDIDATES).map(candidate => candidate.url);
  assert.equal(urls.length, 5);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.equal(url.startsWith("./"), true, url);
    const target = new URL(url, root);
    assert.equal(existsSync(fileURLToPath(target)), true, url);
  }
});

test("recorder dropdown and step-mode deep link have matching candidate IDs", () => {
  const root = new URL("../", import.meta.url);
  const html = readFileSync(new URL("./evaluate.html", root), "utf8");
  const stepHTML = readFileSync(new URL("./spikes/step-routing.html", root), "utf8");
  const stepJS = readFileSync(new URL("./spikes/step-routing.mjs", root), "utf8");
  for (const id of Object.keys(CANDIDATES)) {
    assert.ok(html.includes('value="' + id + '"'), "missing recorder option: " + id);
  }
  assert.match(stepHTML, /id="record-this-mode"/);
  assert.match(stepJS, /"double-pass-step" : "relay-step"/);
  assert.match(stepJS, /\.\.\/evaluate\.html\?candidate=/);
});
