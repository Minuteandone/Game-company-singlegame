import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("matched comparison guide counterbalances the Double Pass order", async () => {
  const html = await readFile(new URL("./compare.html", root), "utf8");
  const timedFirst = html.match(/<article[^>]+data-comparison-order="timed-first"[\s\S]*?<\/article>/)?.[0];
  const stepFirst = html.match(/<article[^>]+data-comparison-order="step-first"[\s\S]*?<\/article>/)?.[0];

  assert.ok(timedFirst, "timed-first sequence is missing");
  assert.ok(stepFirst, "step-first sequence is missing");

  assert.ok(
    timedFirst.indexOf("./spikes/double-pass.html") <
      timedFirst.indexOf("./spikes/step-routing.html?level=double-pass"),
    "Sequence A must play timed Double Pass before Step"
  );
  assert.ok(
    stepFirst.indexOf("./spikes/step-routing.html?level=double-pass") <
      stepFirst.indexOf("./spikes/double-pass.html"),
    "Sequence B must play Step Double Pass before timed"
  );
  assert.match(html, /Alternate Sequence A and B across testers/i);
});

test("comparison guide keeps baseline contextual and links every observation to the recorder", async () => {
  const html = await readFile(new URL("./compare.html", root), "utf8");

  assert.match(html, /FROZEN BASELINE/);
  assert.match(html, /not geometry-matched to Double Pass/i);
  assert.match(html, /href="\.\/evaluate\.html\?candidate=baseline"/);
  assert.equal((html.match(/href="\.\/evaluate\.html\?candidate=double-pass"/g) ?? []).length, 2);
  assert.equal((html.match(/href="\.\/evaluate\.html\?candidate=double-pass-step"/g) ?? []).length, 2);
  assert.match(html, /does not choose Continue \/ Mutate \/ Replace/i);
  assert.match(html, /Attempted, not completed/);
  assert.match(html, /Sharing a copied report.*optional/i);
  assert.match(html, /avoid identifying information or private details/i);
});

test("launcher and repository homepage expose the matched comparison guide", async () => {
  const [modes, homepage] = await Promise.all([
    readFile(new URL("./modes.html", root), "utf8"),
    readFile(new URL("../../../index.html", import.meta.url), "utf8")
  ]);

  assert.match(modes, /href="\.\/compare\.html"/);
  assert.match(homepage, /href="\.\/experiments\/lumen-relay\/compare\.html"/);
});


test("matched guide keeps paired A/B order traceable without identity", async () => {
  const [html, protocol] = await Promise.all([
    readFile(new URL("./compare.html", root), "utf8"),
    readFile(new URL("../../../docs/live-routing-evaluation.md", import.meta.url), "utf8")
  ]);
  assert.match(html, /Other observations/);
  assert.match(html, /Pair 01/);
  assert.match(html, /Sequence A \(timed first\)/);
  assert.match(html, /Sequence B \(step first\)/);
  assert.match(protocol, /non-identifying pair label/);
  assert.match(protocol, /preserves the order/);
});

test("all local links in the guide still point at checked-in pages", async () => {
  const html = await readFile(new URL("./compare.html", root), "utf8");
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const links = [...html.matchAll(/href="([^"]+)"/g)]
    .map(match => match[1])
    .filter(value => value.startsWith("./") || value.startsWith("../"));
  assert.ok(links.length >= 12);
  for (const href of links) {
    const target = new URL(href, new URL("./compare.html", root));
    assert.equal(target.protocol, "file:");
    assert.equal(existsSync(fileURLToPath(target)), true, "Broken guide link " + href);
  }
});
