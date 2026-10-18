/**
 * [agent-01 | AI] Discover and run test scripts for prototypes in this repo.
 * No dependencies, configuration, or hard-coded game path required.
 * Usage: node scripts/verify.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['.git', '.github', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const packages = [];

function visit(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (item.isDirectory() && !skip.has(item.name)) visit(join(directory, item.name));
    if (item.isFile() && item.name === 'package.json') {
      const path = join(directory, item.name);
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof manifest.scripts?.test === 'string' && manifest.scripts.test.trim()) {
        packages.push({ directory, name: manifest.name ?? relative(root, directory) });
      }
    }
  }
}

visit(root);
packages.sort((a, b) => a.directory.localeCompare(b.directory));
if (packages.length === 0) {
  console.log('No test scripts found yet; nothing to verify.');
  process.exit(0);
}

console.log('Found ' + packages.length + ' test package(s).');
let failed = 0;
for (const { directory, name } of packages) {
  console.log('\n▶ ' + name + ' (' + (relative(root, directory) || '.') + ')');
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test'], {
    cwd: directory,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error('✘ ' + name + ': ' + (result.error?.message ?? ('exit ' + (result.status ?? result.signal))));
    failed++;
  }
}
console.log('\n' + (packages.length - failed) + '/' + packages.length + ' test packages passed.');
if (failed) process.exitCode = 1;
