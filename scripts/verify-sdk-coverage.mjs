#!/usr/bin/env node
/**
 * verify-sdk-coverage.mjs — Phases 4–7 SDK coverage gate.
 *
 * Reads the cached OpenAPI artifact at
 * `quiz_backend/docs/generated/openapi.json` and the regenerated SDK
 * under `quiz_frontend/src/lib/api/generated/`. For every
 * `(method, path)` pair belonging to the selected phase, the script
 * asserts that a regenerated orval/axios function exists in the SDK
 * and (optionally) has at least one feature-consumer import.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source tickets: TKT-4.1.A2 (Phase 4), TKT-5.1.A2 (Phase 5),
 *                 TKT-6.1.A2 (Phase 6 lists),
 *                 TKT-6.3.A2 (Phase 6 analytics),
 *                 TKT-6.4.A2 (Phase 6 mutuals + activity),
 *                 TKT-6.5.A2 (Phase 6 social discovery + search),
 *                 TKT-7.1.A6 (Phase 7).
 *
 * ## What is "Phase 4" vs "Phase 5" vs "Phase 6" vs "Phase 7"
 *
 * Phase 4 endpoints match:
 *   /api/v1/attempts/...  /api/v1/bookmarks/...
 *   /api/v1/comments/...  /api/v1/quizzes/...
 *   /api/v1/reviews/...    /api/v1/users/...
 *
 * Phase 5 endpoints match:
 *   /api/v1/tournaments/...  /api/v1/instances/...
 *   /api/v1/notifications/... /api/v1/leaderboard/...
 *   /api/v1/achievements/... /api/v1/search/...
 *
 * Phase 6 endpoints match:
 *   /api/v1/social/...      (single module: `social.ts`)
 *
 * Phase 7 admin endpoints (Epic 7.1) are split across the existing
 * module SDKs (review reports under `reviews`, comment reports under
 * `comments`, tag/category CRUD under their respective modules,
 * ranking admin under `rankings`, achievement admin under
 * `achievements`, tournament admin under `tournaments`, and the
 * `/admin/*` mount under `admin` when generated). When the SDK is
 * regenerated for Phase 7, the prefix match below covers every
 * `(method, path)` pair.
 *
 * Select which phase to gate with `--phase <n>` (default: 4).
 * Use `--phase all` to run all four phases in sequence.
 *
 * ## Checks
 *
 *   1. `sdk`  — every (method, path) in the selected phase has an SDK
 *               function with the same (method, path) pair. Always run.
 *   2. `consumers` — every (method, path) has at least one `import`
 *               of a function that calls it inside `src/features/**`.
 *               Run with `--check all`. Phase 5 enforcement activates
 *               at TKT-5.1.F7; Phase 6 enforcement activates at
 *               TKT-6.1.E1 (first feature-service land); Phase 7
 *               activates at TKT-7.1.F7 (first admin-service land).
 *
 * ## Exit codes
 *
 *   0  every required check passed
 *   1  a required check failed
 *   2  usage error (bad flags, missing files, etc.)
 *   64 usage (after `--help`)
 *
 * ## Usage
 *
 *   node scripts/verify-sdk-coverage.mjs               # Phase 4 default
 *   node scripts/verify-sdk-coverage.mjs --phase 5     # Phase 5 only
 *   node scripts/verify-sdk-coverage.mjs --phase 6     # Phase 6 only
 *   node scripts/verify-sdk-coverage.mjs --phase all   # All three phases
 *   node scripts/verify-sdk-coverage.mjs --ci           # CI mode
 *   node scripts/verify-sdk-coverage.mjs --check all   # Enforce consumers
 *   node scripts/verify-sdk-coverage.mjs --help
 *
 *   # Via `pnpm`:
 *   pnpm verify:sdk-coverage --phase 5
 *   pnpm verify:sdk-coverage --phase all
 *
 * The script does not modify any tracked file.
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

// ─── Phase definitions ───────────────────────────────────────────────────────
const PHASES = {
  4: {
    label: 'Phase 4',
    tags: ['attempts', 'bookmarks', 'reviews', 'comments', 'quizzes', 'users'],
    prefix: /^\/api\/v1\/(quizzes|bookmarks|reviews|comments|attempts|users)/,
  },
  5: {
    label: 'Phase 5',
    tags: ['tournaments', 'instances', 'notifications', 'leaderboards', 'achievements', 'search'],
    prefix: /^\/api\/v1\/(tournaments|instances|notifications|leaderboard|achievements|search)/,
  },
  6: {
    // Phase 6 social lives in a single SDK module file (`social.ts`).
    // All functions are exported from the `getSocial()` namespace object.
    // Source epic: Epic 6.1.
    // Source tickets: TKT-6.1.A2 (universal coverage),
    //                 TKT-6.2.A2 (read-only graph lists),
    //                 TKT-6.3.A2 (analytics),
    //                 TKT-6.4.A2 (mutuals + activity),
    //                 TKT-6.5.A2 (social discovery + search).
    //
    // The four Story 6.5 discovery endpoints (Epic 6.5 — Social Discovery:
    // Suggestions, Search Suggestions, User Search, Trending) are:
    //
    //   GET /api/v1/social/suggestions
    //       -> socialControllerGetSuggestions
    //   GET /api/v1/social/search/suggestions
    //       -> socialControllerGetSearchSuggestions
    //   GET /api/v1/social/users/search
    //       -> socialControllerSearchUsers
    //   GET /api/v1/social/users/trending
    //       -> socialControllerGetTrendingUsers
    //
    // All four are generated into `social.ts` today and are
    // covered by the `/api/v1/social` prefix match below. Their
    // first feature-consumer imports land in TKT-6.5.C1 and
    // TKT-6.5.D1.
    label: 'Phase 6',
    tags: ['social'],
    prefix: /^\/api\/v1\/social/,
    // Deprecated singular path — never call. The 6 standard HTTP
    // methods (GET/POST/PUT/DELETE/PATCH/HEAD) are generated by orval
    // and all return 405. OPTIONS and SEARCH are declared in the
    // OpenAPI spec but not generated by orval (it only handles
    // standard methods); they are also unreachable in practice and
    // the lint script in `deprecated-routes.ts` blocks the path
    // entirely, so they should not be reported as "absent".
    excludePaths: [/^\/api\/v1\/social\/friend-request$/],
  },
  7: {
    // Phase 7 admin surfaces (Epic 7.1). Each admin capability is
    // owned by its existing module SDK file (reviews, comments, tags,
    // categories, rankings, achievements, tournaments). The optional
    // `admin` tag covers the standalone social-admin mount
    // (`/admin/users/:userId/roles`) which is generated into its own
    // SDK module.
    // Source epic:   Epic 7.1.
    // Source ticket: TKT-7.1.A6.
    label: 'Phase 7',
    tags: [
      // Reuse existing module SDKs for module-scoped admin endpoints
      // (review reports live under /reviews/reports; comment reports
      // under /comments/reports; tag CRUD under /tags; category CRUD
      // under /categories; ranking admin under /rankings/admin;
      // achievement admin under /achievements/admin; tournament admin
      // under /tournaments).
      'reviews',
      'comments',
      'tags',
      'categories',
      'rankings',
      'achievements',
      'tournaments',
      'users',
      // Optional standalone module for the social-admin mount.
      'admin',
    ],
    // Phase 7 endpoint families:
    //   /api/v1/reviews/reports...      (review moderation)
    //   /api/v1/comments/reports...     (comment moderation)
    //   /api/v1/comments/:id/hide       (comment moderation)
    //   /api/v1/comments/:id/restore    (comment moderation)
    //   /api/v1/tags...                 (tag admin)
    //   /api/v1/categories...           (category admin)
    //   /api/v1/rankings/admin/...      (ranking admin)
    //   /api/v1/achievements/admin/...  (achievement admin)
    //   /api/v1/tournaments/admin/...   (NOT a real route — tournament
    //                                   admin is /api/v1/tournaments)
    //   /api/v1/admin/users/:userId/... (role grant)
    prefix:
      /^\/api\/v1\/(reviews\/reports|comments\/reports|comments\/[^/]+\/(hide|restore)|tags|categories|rankings\/admin|achievements\/admin|tournaments\/admin|admin\/users)/,
    // Excluded paths that are documented but not generated (deprecated
    // by Phase 7 hygiene). Keep alphabetical.
    excludePaths: [],
  },
};

const HELP = `Usage: node scripts/verify-sdk-coverage.mjs [flags]

Flags:
  --phase <n>      Which phase to gate: 4, 5, 6, 7, or "all". Default: 4.
  --ci             Treat warnings as errors.
  --check <subset> Which checks to run: "sdk" (default) or "all".
  --openapi <path> Override OpenAPI artifact path. Default:
                     quiz_backend/docs/generated/openapi.json
  --sdk <path>     Override generated SDK root. Default:
                     quiz_frontend/src/lib/api/generated
  --features <path> Override features root for the consumer-import check.
                     Default: quiz_frontend/src/features
  --help, -h       Show this help and exit.

Exit codes:
  0  all required checks passed
  1  at least one required check failed
  2  configuration error
 64  usage (after --help)
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
  phases: [4],
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
      case '--phase': {
        const v = args[++i];
        if (v === 'all') {
          opts.phases = [4, 5, 6, 7];
        } else if (v === '4' || v === '5' || v === '6' || v === '7') {
          opts.phases = [parseInt(v, 10)];
        } else {
          fail(`--phase must be 4, 5, 6, 7, or "all" (got ${JSON.stringify(v)})`);
        }
        break;
      }
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
 * Walk <sdkRoot>/<tag>/<tag>.ts for the given phase and return a Map
 * {`METHOD /api/v1/...` -> {tag, name, file}}.
 */
function scanSdk(sdkRoot, phase) {
  const out = new Map();
  for (const tag of PHASES[phase].tags) {
    const file = path.join(sdkRoot, tag, tag + '.ts');
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    // Extract every function that calls orvalCustomInstance.
    // Strategy: scan the file char-by-char to handle multi-line return statements.
    // We look for:
    //   const NAME = ( ... ) => { return orvalCustomInstance<...>({url:`...`, method:'...'});
    // The orval output has {url:`...`} and method:'...' on the same or adjacent lines.
    const matches = [];
    const funcRe = /const (\w+)\s*=\s*\(/g;
    const urlMethodRe = /return orvalCustomInstance<[^>]+>\(\s*\{url:\s*`([^`]+)`,\s*method:\s*'([A-Z]+)'[^}]*\}/;

    let pos = 0;
    const text = content;
    while (pos < text.length) {
      funcRe.lastIndex = pos;
      const nameMatch = funcRe.exec(text);
      if (!nameMatch) break;
      const funcName = nameMatch[1];
      const afterName = nameMatch.index + nameMatch[0].length;

      // Search forward from after the name for the return orvalCustomInstance call
      const searchWindow = text.slice(afterName, afterName + 500);
      const returnMatch = urlMethodRe.exec(searchWindow);
      if (returnMatch) {
        matches.push({ funcName, rawUrl: returnMatch[1], method: returnMatch[2] });
        pos = afterName + returnMatch.index + returnMatch[0].length;
      } else {
        pos = afterName;
      }
    }
    for (const { funcName, rawUrl, method } of matches) {
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
function checkSdk(sdkMap, openApiPath, phase) {
  const openapi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const rows = [];
  let absents = 0;
  const excludes = PHASES[phase].excludePaths || [];
  for (const [p, ops] of Object.entries(openapi.paths || {})) {
    if (!PHASES[phase].prefix.test(p)) continue;
    if (excludes.some((re) => re.test(p))) continue;
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
function checkConsumers(sdkMap, openApiPath, featuresRoot, phase) {
  const openapi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  const used = scanFeatureConsumers(featuresRoot, sdkMap);
  const rows = [];
  let orphan = 0;
  const excludes = PHASES[phase].excludePaths || [];
  for (const [p, ops] of Object.entries(openapi.paths || {})) {
    if (!PHASES[phase].prefix.test(p)) continue;
    if (excludes.some((re) => re.test(p))) continue;
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
let anyFailure = false;
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = (ok, label) =>
  useColor ? `\u001b[${ok ? '32' : '31'}m${label}\u001b[0m` : label;

for (const phase of opts.phases) {
  const { label } = PHASES[phase];
  process.stdout.write(`\n[verify-sdk-coverage] ${label} SDK coverage gate\n`);
  process.stdout.write(`  openapi   = ${opts.openApi}\n`);
  process.stdout.write(`  sdk root  = ${opts.sdkRoot}\n`);
  process.stdout.write(`  checks    = ${opts.check}${opts.ci ? ' (CI mode)' : ''}\n\n`);

  const sdkMap = scanSdk(opts.sdkRoot, phase);

  // Check 1: SDK existence.
  {
    const r = checkSdk(sdkMap, opts.openApi, phase);
    process.stdout.write(`[sdk]  ${r.absents} absent / ${r.total} (method, path) pairs\n`);
    if (r.absents > 0) {
      anyFailure = true;
      for (const row of r.rows.filter((x) => !x.ok)) {
        process.stdout.write(`       ${fmt(false, 'MISSING')} ${row.method} ${row.path}\n`);
      }
    }
  }

  // Check 2: consumer imports.
  if (opts.check === 'all') {
    const r = checkConsumers(sdkMap, opts.openApi, opts.featuresRoot, phase);
    process.stdout.write(`\n[features]  ${r.orphan} endpoint(s) have no feature consumer\n`);
    if (r.orphan > 0) {
      anyFailure = true;
      for (const row of r.rows.filter((x) => !x.used)) {
        process.stdout.write(`       ${fmt(false, 'NO CONSUMER')} ${row.method} ${row.path}  (${row.name})\n`);
      }
    }
  } else {
    process.stdout.write(`\n[features]  skipped (use --check all to enable)\n`);
  }
}

if (anyFailure) {
  process.stderr.write(`\n[verify-sdk-coverage] FAILED\n`);
  process.exit(1);
}
process.stdout.write(`\n[verify-sdk-coverage] OK\n`);
process.exit(0);
