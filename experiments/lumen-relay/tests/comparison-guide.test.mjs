import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
});

test("launcher and repository homepage expose the matched comparison guide", async () => {
  const [modes, homepage] = await Promise.all([
    readFile(new URL("./modes.html", root), "utf8"),
    readFile(new URL("../../../index.html", import.meta.url), "utf8")
  ]);

  assert.match(modes, /href="\.\/compare\.html"/);
  assert.match(homepage, /href="\.\/experiments\/lumen-relay\/compare\.html"/);
});


test("every comparison guide local link resolves to a checked-in page or protocol", async () => {
  const html = await readFile(new URL("./compare.html", root), "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const localLinks = hrefs.filter(href =>
    href.startsWith("./") || href.startsWith("../"));
  assert.ok(localLinks.length >= 12, "comparison guide should link games, recordings, and protocol");
  for (const href of localLinks) {
    const target = new URL(href, new URL("./compare.html", root));
    assert.equal(target.protocol, "file:");
    assert.ok(existsSync(fileURLToPath(target)), "Broken local comparison guide link: " + href);
  }
});

test("the public comparison guide states opt-in sharing and avoids private data", async () => {
  const html = await readFile(new URL("./compare.html", root), "utf8");
  assert.match(html, /public GitHub evaluation issue is optional/);
  assert.match(html, /leave out names, addresses, account information and other private details/);
  assert.match(html, /stores notes only in this browser/);
  assert.doesNotMatch(html, /<script\b/i, "a static guide needs no scripts or analytics");
});
