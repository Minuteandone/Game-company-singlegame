import test from "node:test";
import assert from "node:assert/strict";
import { parseSmokeResult } from "../../../scripts/smoke-result.mjs";

function html(state, report) {
  return '<!doctype html><html><body' +
    (state ? ' data-smoke="' + state + '"' : '') + '>' +
    '<pre id="smoke-report">' + report + '</pre>' +
    '<script>const passMessage = "__LUMEN_SMOKE_PASS__ 999 checks";</script>' +
    '</body></html>';
}

test("accept a completed pass from the rendered report and body state", () => {
  assert.deepEqual(parseSmokeResult(html("pass", "__LUMEN_SMOKE_PASS__ 123 checks")), {
    state: "pass", report: "__LUMEN_SMOKE_PASS__ 123 checks", checkCount: 123, passed: true
  });
});

test("reject an unfinished run even if PASS appears in its script source", () => {
  const result = parseSmokeResult(html(null, "SMOKE_RUNNING"));
  assert.equal(result.passed, false);
  assert.equal(result.state, null);
  assert.equal(result.report, "SMOKE_RUNNING");
});

test("reject mismatched success text and failed body state", () => {
  assert.equal(parseSmokeResult(html("fail", "__LUMEN_SMOKE_PASS__ 123 checks")).passed, false);
  assert.equal(parseSmokeResult(html("pass", "__LUMEN_SMOKE_FAIL__ Error")).passed, false);
});

test("reject a success report without completed state", () => {
  assert.equal(parseSmokeResult(html(null, "__LUMEN_SMOKE_PASS__ 80 checks")).passed, false);
  assert.equal(parseSmokeResult(html("pass", "SMOKE_RUNNING")).passed, false);
});

test("reject empty and malformed success counts", () => {
  assert.equal(parseSmokeResult(html("pass", "__LUMEN_SMOKE_PASS__ 0 checks")).passed, false);
  assert.equal(parseSmokeResult(html("pass", "__LUMEN_SMOKE_PASS__ NaN checks")).passed, false);
  assert.equal(parseSmokeResult(html("pass", "__LUMEN_SMOKE_PASS__ 12 checks extra")).passed, false);
});

test("parse normal serialized DOM with additional attributes", () => {
  const doc = '<body class="harness" data-smoke="pass">' +
    '<pre aria-live="polite" id="smoke-report">__LUMEN_SMOKE_PASS__ 78 checks</pre></body>';
  assert.equal(parseSmokeResult(doc).checkCount, 78);
  assert.equal(parseSmokeResult(doc).passed, true);
});

test("reject a completely missing report element", () => {
  const result = parseSmokeResult('<body data-smoke="pass"><script>__LUMEN_SMOKE_PASS__ 900 checks</script></body>');
  assert.equal(result.passed, false);
  assert.equal(result.report, "No rendered smoke outcome found");
});
