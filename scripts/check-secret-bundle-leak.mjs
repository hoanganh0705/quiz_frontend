#!/usr/bin/env node
/**
 * check-secret-bundle-leak.mjs — Security gate.
 *
 * Verifies storage secrets never leak into the production
 * frontend bundle. R2 credentials (R2_SECRET_ACCESS_KEY, R2_ACCESS_KEY_ID)
 * are server-only.
 *
 * Two checks:
 *   1. Source-level: ensure no storage secret reference exists
 *      in any file that ships to the browser (`src/`, excluding
 *      server-only filenames).
 *   2. Bundle-level: when present, scan `.next/` for the literal env
 *      var name (the value would be inlined at build time).
 *
 * Exit codes:
 *   0 — no leak detected.
 *   1 — leak found (source or bundle).
 *   2 — bundle not built (run `pnpm build` first).
 *
 * Usage:
 *   node scripts/check-secret-bundle-leak.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SECRET_VARS = ['R2_SECRET_ACCESS_KEY', 'R2_ACCESS_KEY_ID'];
const BUNDLE_DIR = resolve(ROOT, '.next');

let leakFound = false;

// ─── 1. Source-level scan ─────────────────────────────────────────────

function walk(dir, predicate, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      walk(full, predicate, results);
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

const SOURCE_FILES = walk(
  resolve(ROOT, 'src'),
  (file) =>
    /\.(ts|tsx|js|jsx|mjs)$/.test(file) &&
    !file.includes('secret-bundle-leak'),
);

for (const file of SOURCE_FILES) {
  const src = readFileSync(file, 'utf8');
  for (const secretVar of SECRET_VARS) {
    if (src.includes(secretVar)) {
      console.error(`check-secret-bundle-leak: SOURCE LEAK (${secretVar}) at ${file.replace(ROOT + '/', '')}`);
      leakFound = true;
    }
  }
}

// ─── 2. Bundle-level scan ─────────────────────────────────────────────

if (!existsSync(BUNDLE_DIR)) {
  console.error('check-secret-bundle-leak: .next/ not found — run `pnpm build` first');
  process.exit(2);
}

const BUNDLE_FILES = walk(BUNDLE_DIR, (file) => /\.(js|cjs|mjs)$/.test(file));

for (const file of BUNDLE_FILES) {
  const src = readFileSync(file, 'utf8');
  for (const secretVar of SECRET_VARS) {
    if (src.includes(secretVar)) {
      console.error(`check-secret-bundle-leak: BUNDLE LEAK (${secretVar}) at ${file.replace(ROOT + '/', '')}`);
      leakFound = true;
    }
  }
}

if (leakFound) {
  console.error('check-secret-bundle-leak: FAIL — secret reference detected');
  process.exit(1);
}

console.log('check-secret-bundle-leak: OK — no secret reference in source or bundle');
process.exit(0);
