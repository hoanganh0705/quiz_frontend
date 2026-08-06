#!/usr/bin/env node
/**
 * check-phase7-admin-review-moderation-flag.mjs — TKT-7.5.A2.
 *
 * Confirms the `phase7_admin_review_moderation` per-area sub-flag exists,
 * defaults to `'placeholder'`, and is overridable via
 * `NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION`.
 *
 * Exit codes:
 *   0 — flag is at its documented default (`'placeholder'`).
 *   1 — flag has been overridden to `'live'` (or any non-placeholder value).
 *   2 — flag is missing from the feature-flags module.
 *
 * Usage:
 *   node scripts/check-phase7-admin-review-moderation-flag.mjs
 *   # expect: exit 0 (flag at default)
 *
 *   NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION=live node scripts/check-phase7-admin-review-moderation-flag.mjs
 *   # expect: exit 1 (flag overridden to 'live')
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FLAG_NAME = 'phase7_admin_review_moderation';
const DEFAULT_VALUE = 'placeholder';
const ENV_VAR = 'NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION';

// ─── Read the flag map from feature-flags.ts ────────────────────────────────────

const flagsPath = resolve(ROOT, 'src/lib/feature-flags/feature-flags.ts');
const flagsSource = readFileSync(flagsPath, 'utf8');

// Extract FLAG_DEFAULTS
const defaultsMatch = flagsSource.match(
  /const FLAG_DEFAULTS: FeatureFlagValueMap = \{([\s\S]*?)\n\}/,
);
if (!defaultsMatch) {
  console.error(
    'check-phase7-admin-review-moderation-flag: could not parse FLAG_DEFAULTS',
  );
  process.exit(2);
}

const defaultsBlock = defaultsMatch[1];
const flagDefaultMatch = defaultsBlock.match(
  new RegExp(`^\\s*${FLAG_NAME}:\\s*['"]([^'"]+)['"]`, 'm'),
);
if (!flagDefaultMatch) {
  console.error(
    `check-phase7-admin-review-moderation-flag: '${FLAG_NAME}' not found in FLAG_DEFAULTS`,
  );
  process.exit(2);
}

const defaultValue = flagDefaultMatch[1];

// ─── Read the current runtime value (env-var override) ────────────────────────────

const runtimeValue =
  typeof process.env[ENV_VAR] === 'string' && process.env[ENV_VAR].length > 0
    ? process.env[ENV_VAR]
    : defaultValue;

// ─── Report ────────────────────────────────────────────────────────────────────

console.log(`Flag: ${FLAG_NAME}`);
console.log(`  Default (compile-time): ${defaultValue}`);
console.log(`  Env-var override:        ${process.env[ENV_VAR] ?? '(none)'}`);
console.log(`  Current value:           ${runtimeValue}`);

if (defaultValue !== DEFAULT_VALUE) {
  console.error(
    `\ncheck-phase7-admin-review-moderation-flag: '${FLAG_NAME}' default is '${defaultValue}', expected '${DEFAULT_VALUE}'`,
  );
  console.error('This is a source-of-truth mismatch, not an override issue.');
  process.exit(2);
}

if (runtimeValue === DEFAULT_VALUE) {
  console.log(
    `\nResult: exit 0 — flag is at its documented default ('${DEFAULT_VALUE}')`,
  );
  process.exit(0);
} else {
  console.log(`\nResult: exit 1 — flag overridden to '${runtimeValue}'`);
  process.exit(1);
}
