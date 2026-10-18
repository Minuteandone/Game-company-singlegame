/**
 * [agent-01 | AI] Dependency-free Chromium smoke runner for Lumen Relay.
 * Node.js 22+, Chromium/Google Chrome on PATH (or LUMEN_BROWSER=<binary>).
 * Run from repo root: node scripts/smoke-browser.mjs
 */
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, resolve, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [process.env.LUMEN_BROWSER, 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'].filter(Boolean);
const browserPath = candidates.find(command => !spawnSync(command, ['--version'], { timeout: 3000 }).error);
if (!browserPath) {
  console.error('Browser smoke requires Chromium/Chrome. Set LUMEN_BROWSER or install Chromium.');
  process.exit(1);
}
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

const profile = mkdtempSync(join(tmpdir(), 'lumen-chrome-'));
let browser;
let didTimeout = false;
try {
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/experiments/lumen-relay/tests/browser-smoke.html`;
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--virtual-time-budget=50000', '--dump-dom', `--user-data-dir=${profile}`, url
  ];
  browser = spawn(browserPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let errors = '';
  browser.stdout.setEncoding('utf8');
  browser.stderr.setEncoding('utf8');
  browser.stdout.on('data', chunk => { output += chunk; });
  browser.stderr.on('data', chunk => { errors = (errors + chunk).slice(-6000); });
  const timeout = setTimeout(() => { didTimeout = true; browser.kill('SIGKILL'); }, 70000);
  const exitCode = await new Promise((resolve, reject) => {
    browser.on('error', reject);
    browser.on('close', resolve);
  });
  clearTimeout(timeout);
  const result = output.match(/__LUMEN_SMOKE_(PASS|FAIL)__[^<]*/)?.[0] || 'No smoke outcome found';
  const passed = exitCode === 0 && !didTimeout && result.startsWith('__LUMEN_SMOKE_PASS__');
  console.log(result.replaceAll('&gt;', '>').replaceAll('&lt;', '<'));
  if (!passed) {
    console.error('Browser smoke failed; Chromium code:', exitCode, 'timed out:', didTimeout);
    console.error(errors.slice(-1500));
    process.exitCode = 1;
  }
} finally {
  if (browser && !browser.killed && browser.exitCode == null) browser.kill('SIGKILL');
  await new Promise(resolve => server.close(resolve));
  rmSync(profile, { recursive: true, force: true });
}
