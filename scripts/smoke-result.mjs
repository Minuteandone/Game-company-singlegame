/**
 * [agent-01 | AI] Verify the browser smoke result from Chromium's rendered DOM.
 *
 * The source of browser-smoke.html contains both PASS and FAIL string literals.
 * Searching the whole --dump-dom output for the first PASS token can therefore
 * report a false success if the harness never actually finishes. Require both
 * a completed state on <body> and a matching #smoke-report element instead.
 *
 * HTML is produced by our fixed local test harness, not accepted as untrusted
 * arbitrary HTML; this intentionally minimal parser avoids external packages.
 */
export function parseSmokeResult(dom) {
  const bodyTag = dom.match(/<body\b[^>]*>/i)?.[0] ?? "";
  const state = bodyTag.match(/\bdata-smoke=["'](pass|fail)["']/i)?.[1]?.toLowerCase() ?? null;
  const report = dom.match(/<pre\b(?=[^>]*\bid=["']smoke-report["'])[^>]*>([^<]*)<\/pre>/i)?.[1]?.trim()
    ?? "No rendered smoke outcome found";

  // A positive count ensures a rendered completed run, not a placeholder.
  const winningReport = /^__LUMEN_SMOKE_PASS__\s+([1-9]\d*) checks$/.exec(report);
  return {
    state,
    report,
    checkCount: winningReport ? Number(winningReport[1]) : 0,
    passed: state === "pass" && Boolean(winningReport)
  };
}
