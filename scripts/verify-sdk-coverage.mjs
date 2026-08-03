#!/usr/bin/env node
/**
 * verify-sdk-coverage.mjs — Phase 4 SDK coverage gate.
 *
 * Reads the cached OpenAPI artifact at
 * `quiz_backend/docs/generated/openapi.json` and the regenerated SDK
 * under `quiz_frontend/src/lib/api/generated/`. For every Phase-4
 * `(method, path)` pair, the script asserts that a regenerated
 * orval/axios function exists in the SDK and emits a fixed-shape
 * result suitable for CI logs.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.A2.
 *
 * ## What is "Phase 4"
 *
 * Phase 4 endpoints are those whose OpenAPI path matches one of:
 *   /api/v1/attempts/...
 *   /api/v1/bookmarks/...
 *   /api/v1/comments/...
 *   /api/v1/quizzes/...
 *   /api/v1/reviews/...
 *   /api/v1/users/...
 *
 * This is the same Phase-4 slice used by TKT-4.1.A1
 * (`projectDocs/Tickets/Phase4/evidence/EPIC_4_1_A1.md`).
 *
 * ## Checks
 *
 * Two checks are wired in. Until the F6 / F7 tickets land (which
 * formalise "every Phase 4 endpoint must have a feature consumer"),
 * only the SDK-existence check (`--check sdk`) is enforced by default.
 * Use `--check all` to enable the consumer-import check too.
 *
 *   1. `sdk`  — every Phase-4 (method, path) has an SDK function with
 *               the same `(method, path)` pair. Always run by default.
 *   2. `consumers` — every Phase-4 (method, path) has at least one
 *               `import` of a function that calls it inside
 *               `quiz_frontend/src/features/**`. Run with `--check all`
 *               (Phase 4 enforcement kicks in at F6/F7).
 *
 * ## Exit codes
 *
 *   0  every required check passed
 *   1  a required check failed (any `absent` row in the SDK check, or
 *      any unmatched row in the consumer check)
 *   2  usage error (bad flags, missing files, etc.)
 *   64 usage (after `--help`)
 *
 * ## Usage
 *
 *   node scripts/verify-sdk-coverage.mjs                # default check
 *   node scripts/verify-sdk-coverage.mjs --ci           # CI mode
 *   node scripts/verify-sdk-coverage.mjs --check all    # enforce both
 *   node scripts/verify-sdk-coverage.mjs --help
 *
 *   # Via `pnpm`:
 *   pnpm verify:sdk-coverage
 *   pnpm verify:sdk-coverage:ci
 *
 * The script does not modify any tracked file. It only reads the
 * OpenAPI artifact, the regenerated SDK, and (optionally) scans
 * `src/features/**` for imports.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const defaultOpenApi = path.join(repoRoot, 'quiz_backend/docs/generated/openapi.json');
const defaultSdkRoot = path.join(frontendRoot, 'src/lib/api/generated');
const defaultFeaturesRoot = path.join(frontendRoot, 'src/features');

const phase4Tags = ['attempts', 'bookmarks', 'reviews', 'comments', 'quizzes', 'users'];
const phase4Prefix = /^\/api\/v1\/(quizzes|bookmarks|reviews|comments|attempts|users)/;

const HELP = `Usage: node scripts/verify-sdk-coverage.mjs [flags]

Flags:
  --ci               Treat warnings as errors (currently: no warnings emitted).
  --check <subset>   Which checks to run. <subset> is "sdk" (default) or "all".
  --openapi <path>   Override OpenAPI artifact path. Default:
                       quiz_backend/docs/generated/openapi.json
  --sdk <path>       Override generated SDK root. Default:
                       quiz_frontend/src/lib/api/generated
  --features <path>  Override features root for the consumer-import check.
                       Default: quiz_frontend/src/features
  --help, -h         Show this help and exit.

Exit codes:
  0  all required checks passed
  1  at least one required check failed (see stdout for the offending rows)
  2  configuration error (missing files, unknown flag, etc.)
  64 usage (after --help)
`;

function fail(msg, code = 2) {
  process.stderr.write(`[verify-sdk-coverage] ${msg}\n`);
  process.exit(code);
}

// ─── CLI parsing ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opts = {
  ci: false,
  check: 'sdk',
  openApi: defaultOpenApi,
  sdkRoot: defaultSdkRoot,
  featuresRoot: defaultFeaturesRoot,
};

function parseFlags(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--ci':
        opts.ci = true;
        break;
      case '--help':
      case '-h':
        process.stdout.write(HELP);
        process.exit(64);
      case '--check': {
        const v = args[++i];
        if (v !== 'sdk' && v !== 'all') fail(`--check must be 'sdk' or 'all' (got ${JSON.stringify(v)})`);
        opts.check = v;
        break;
      }
      case '--openapi':
        opts.openApi = path.resolve(args[++i]);
        break;
      case '--sdk':
        opts.sdkRoot = path.resolve(args[++i]);
        break;
      case '--features':
        opts.featuresRoot = path.resolve(args[++i]);
        break;
      default:
        fail(`unknown flag: ${a}`);
    }
  }
}
parseFlags(argv);

if (!fs.existsSync(opts.openApi)) {
  fail(`OpenAPI artifact not found at ${opts.openApi}. Run \`pnpm generate:api\` first.`);
}
if (!fs.existsSync(opts.sdkRoot)) {
  fail(`SDK root not found at ${opts.sdkRoot}.`);
}

// ─── SDK scan ──────────────────────────────────────────────────────────────
/**
 * Walk <sdkRoot>/<tag>/<tag>.ts and return a Map {`METHOD /api/v1/...` -> {tag, name, file}}.
 */
function scanSdk(sdkRoot) {
  const out = new Map();
  for (const tag of phase4Tags) {
    const file = path.join(sdkRoot, tag, tag + '.ts');
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    // Match every JSDoc-block-then-function with `orvalCustomInstance<...>(url:... method:...)`.
    // We only target endpoint-shaped functions, not the outer `get<tag>` builder.
    const re = /\/\*[\s\S]*?\*\s+@summary[^\n]*\n\s*\*\/\s*\nconst (\w+)\s*=\s*\([\s\S]*?\) => \{\s*return orvalCustomInstance<\w+>\(\s*\{url:\s*`([^`]+)`,\s*method:\s*'([A-Z]+)'/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const [, funcName, rawUrl, method] = m;
      const p = rawUrl.replace(/\$\{([a-zA-Z]+)\}/g, '{$1}');
      out.set(`${method.toUpperCase()} ${p}`, {
        tag,
        name: funcName,
        file: path.relative(sdkRoot, file),
      });
    }
  }
  return out;
}

// ─── Consumer scan ──────────────────────────────────────────────────────────
/**
 * Scan `featuresRoot/**` for imports that reference any function in the SDK map.
 * Returns a Set of function names used at least once.
 */
function scanFeatureConsumers(featuresRoot, sdkMap) {
  if (!fs.existsSync(featuresRoot)) return new Set();
  const usedNames = new Set();
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const meta of sdkMap.values()) {
          if (text.includes(meta.name)) usedNames.add(meta.name);
        }
      }
    }
  }
  walk(featuresRoot);
  return usedNames;
}

// ─── Check: SDK existence ───────────────────────────────────────────────────
function checkSdk(sdkMap, openApiPath) {
  const openapi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const rows = [];
  let absents = 0;
  for (const [p, ops] of Object.entries(openapi.paths || {})) {
    if (!phase4Prefix.test(p)) continue;
    for (const method of Object.keys(ops)) {
      const key = `${method.toUpperCase()} ${p}`;
      const entry = sdkMap.get(key);
      if (entry) {
        rows.push({ method: method.toUpperCase(), path: p, ok: true, name: entry.name, tag: entry.tag, file: entry.file });
      } else {
        absents++;
        rows.push({ method: method.toUpperCase(), path: p, ok: false });
      }
    }
  }
  return { rows, absents, total: rows.length };
}

// ─── Check: consumer imports ──────────────────────────────────────────────
function checkConsumers(sdkMap, openApiPath, featuresRoot) {
  const openapi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const used = scanFeatureConsumers(featuresRoot, sdkMap);
  const rows = [];
  let orphan = 0;
  for (const [p, ops] of Object.entries(openapi.paths || {})) {
    if (!phase4Prefix.test(p)) continue;
    for (const method of Object.keys(ops)) {
      const key = `${method.toUpperCase()} ${p}`;
      const entry = sdkMap.get(key);
      if (!entry) continue; // absent, will be reported in the SDK check
      const usedHere = used.has(entry.name);
      if (!usedHere) orphan++;
      rows.push({ method: method.toUpperCase(), path: p, name: entry.name, used: usedHere });
    }
  }
  return { rows, orphan, total: rows.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────
const sdkMap = scanSdk(opts.sdkRoot);

let anyFailure = false;
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = (ok, label) =>
  useColor ? `\u001b[${ok ? '32' : '31'}m${label}\u001b[0m` : label;

process.stdout.write(`\n[verify-sdk-coverage] Phase 4 SDK coverage gate\n`);
process.stdout.write(`  openapi   = ${opts.openApi}\n`);
process.stdout.write(`  sdk root  = ${opts.sdkRoot}\n`);
process.stdout.write(`  checks    = ${opts.check}${opts.ci ? ' (CI mode)' : ''}\n\n`);

// Check 1: SDK existence.
{
  const r = checkSdk(sdkMap, opts.openApi);
  process.stdout.write(`[sdk]  ${r.absents} absent / ${r.total} (method, path) pairs\n`);
  if (r.absents > 0) {
    anyFailure = true;
    for (const row of r.rows.filter((x) => !x.ok)) {
      process.stdout.write(`       ${fmt(false, 'MISSING')} ${row.method} ${row.path}\n`);
    }
  }
}

// Check 2: consumer imports. Only enforced with --check all.
if (opts.check === 'all') {
  const r = checkConsumers(sdkMap, opts.openApi, opts.featuresRoot);
  process.stdout.write(`\n[features]  ${r.orphan} endpoint(s) have no feature consumer\n`);
  if (r.orphan > 0) {
    anyFailure = true;
    for (const row of r.rows.filter((x) => !x.used)) {
      process.stdout.write(`       ${fmt(false, 'NO CONSUMER')} ${row.method} ${row.path}  (${row.name})\n`);
    }
  }
} else {
  process.stdout.write(`\n[features]  skipped (use --check all to enable the F6/F7 enforcement)\n`);
}

if (anyFailure) {
  process.stderr.write(`\n[verify-sdk-coverage] FAILED\n`);
  process.exit(1);
}
process.stdout.write(`\n[verify-sdk-coverage] OK\n`);
process.exit(0);
