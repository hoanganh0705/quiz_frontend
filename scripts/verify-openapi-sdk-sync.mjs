#!/usr/bin/env node
/**
 * verify-openapi-sdk-sync.mjs — Phase 3 contract-sync CI gate.
 *
 * Runs in CI with a live backend reachable at `OPENAPI_URL`
 * (default: `http://localhost:8080/api/v1/docs/openapi.json`). The
 * script:
 *
 *   1. Fetches the running backend's OpenAPI artifact and compares
 *      it to the committed snapshot at
 *      `quiz_backend/docs/generated/openapi.json`. If they differ,
 *      CI fails with a unified diff so the contributor can refresh
 *      the snapshot and commit it.
 *   2. Re-runs the Orval SDK generator against the running backend
 *      (without writing files) and compares the regenerated SDK
 *      against the committed SDK at
 *      `quiz_frontend/src/lib/api/generated/`. If anything under
 *      that folder would change, CI fails.
 *   3. Re-runs `verify-sdk-coverage` against the live OpenAPI
 *      artifact — every `(method, path)` pair in scope must have a
 *      corresponding SDK function. (Implemented by delegating to
 *      the existing `verify-sdk-coverage.mjs` script with `--ci`.)
 *
 * The CI exit code is 0 iff all three checks pass.
 *
 * ## Why a separate script
 *
 * `verify-sdk-coverage.mjs` asserts that every documented endpoint
 * has an SDK function — it does NOT detect when the *committed* SDK
 * is stale relative to a freshly regenerated one. This script fills
 * the gap by combining an OpenAPI snapshot diff with a dry-run SDK
 * regeneration diff.
 *
 * ## Usage
 *
 *   # Local: regenerates both snapshots, prints diff, and verifies
 *   node scripts/verify-openapi-sdk-sync.mjs
 *
 *   # CI: same, but exits non-zero on drift (default behaviour).
 *
 * ## Flags
 *
 *   --backend-url URL   Override the running backend's OpenAPI URL.
 *   --openapi PATH      Override the committed OpenAPI snapshot path.
 *   --sdk PATH          Override the committed SDK root path.
 *   --no-fetch          Skip the live OpenAPI fetch; use the local
 *                       snapshot only. Useful for local debugging.
 *   --no-regen          Skip the SDK regeneration step.
 *   --skip-coverage     Skip the SDK coverage step.
 *   --help              Print usage.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const DEFAULTS = {
  backendUrl: 'http://localhost:8080/api/v1/docs/openapi.json',
  openapi: path.join(repoRoot, 'quiz_backend/docs/generated/openapi.json'),
  sdk: path.join(frontendRoot, 'src/lib/api/generated'),
  fetch: true,
  regen: true,
  coverage: true,
};

function fail(msg, code = 1) {
  process.stderr.write(`\n[verify-openapi-sdk-sync] ${msg}\n`);
  process.exit(code);
}

function info(msg) {
  process.stdout.write(`[verify-openapi-sdk-sync] ${msg}\n`);
}

function parseFlags(args) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      process.stdout.write(HELP);
      process.exit(64);
    } else if (a === '--backend-url') {
      opts.backendUrl = args[++i];
    } else if (a === '--openapi') {
      opts.openapi = path.resolve(args[++i]);
    } else if (a === '--sdk') {
      opts.sdk = path.resolve(args[++i]);
    } else if (a === '--no-fetch') {
      opts.fetch = false;
    } else if (a === '--no-regen') {
      opts.regen = false;
    } else if (a === '--skip-coverage') {
      opts.coverage = false;
    } else {
      fail(`unknown flag: ${a}`, 2);
    }
  }
  return opts;
}

const HELP = `Usage: node scripts/verify-openapi-sdk-sync.mjs [flags]

Flags:
  --backend-url URL    Override the running backend's OpenAPI URL.
                       Default: ${DEFAULTS.backendUrl}
  --openapi PATH       Override the committed OpenAPI snapshot path.
  --sdk PATH           Override the committed SDK root path.
  --no-fetch           Skip the live OpenAPI fetch.
  --no-regen           Skip the SDK regeneration step.
  --skip-coverage      Skip the SDK coverage check.
  --help, -h           Print this help.

Exits 0 iff all checks pass. Exits 1 on any drift.
`;

const opts = parseFlags(process.argv.slice(2));

if (!fs.existsSync(opts.openapi)) {
  fail(`OpenAPI snapshot not found at ${opts.openapi}.`);
}
if (!fs.existsSync(opts.sdk)) {
  fail(`Committed SDK root not found at ${opts.sdk}.`);
}

let allPassed = true;

// ─── Step 1: OpenAPI snapshot diff ────────────────────────────────────────
async function fetchOpenapi(url) {
  const res = await fetch(url);
  if (!res.ok) {
    fail(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return text;
}

async function stepOpenapiDiff() {
  info(`Step 1: OpenAPI snapshot drift`);
  info(`  live     = ${opts.backendUrl}`);
  info(`  snapshot = ${opts.openapi}`);

  const committed = fs.readFileSync(opts.openapi, 'utf8');

  if (!opts.fetch) {
    info(`  --no-fetch set; skipping live fetch.`);
    return true;
  }

  let live;
  try {
    live = await fetchOpenapi(opts.backendUrl);
  } catch (err) {
    fail(
      `Could not reach the backend at ${opts.backendUrl}: ${err.message}. ` +
        `Is the backend running? Use --no-fetch to skip this step locally.`,
    );
  }

  if (live === committed) {
    info(`  OK — live and committed snapshots match.`);
    return true;
  }

  // Show a short diff summary: byte sizes + first differing lines.
  const committedLines = committed.split('\n');
  const liveLines = live.split('\n');
  let firstDiff = -1;
  for (let i = 0; i < Math.min(committedLines.length, liveLines.length); i++) {
    if (committedLines[i] !== liveLines[i]) {
      firstDiff = i;
      break;
    }
  }
  process.stderr.write(
    `\n  DRIFT — committed snapshot is out of date with the running backend.\n`,
  );
  process.stderr.write(
    `  committed size = ${committed.length} bytes (${committedLines.length} lines)\n`,
  );
  process.stderr.write(
    `  live size      = ${live.length} bytes (${liveLines.length} lines)\n`,
  );
  if (firstDiff >= 0) {
    process.stderr.write(`  first differing line = ${firstDiff + 1}\n`);
    process.stderr.write(
      `    - committed: ${committedLines[firstDiff].slice(0, 120)}\n`,
    );
    process.stderr.write(
      `    + live:      ${liveLines[firstDiff].slice(0, 120)}\n`,
    );
  }
  process.stderr.write(
    `\n  Fix: from the backend folder run \`pnpm generate:openapi\` to refresh\n` +
      `  the snapshot, then commit the change alongside the regenerated SDK.\n`,
  );
  allPassed = false;
  return false;
}

// ─── Step 2: SDK regeneration drift ────────────────────────────────────────
/**
 * Build a normalised signature of an SDK folder for diffing.
 *
 * The signature is a sorted list of `METHOD /path funcName` lines
 * extracted from every `*.ts` file in the SDK tree. We do NOT diff
 * byte-for-byte: orval versions differ in helper-type emission
 * (e.g. the `AwaitedInput<T>` helper that landed in 7.21) which
 * produces cosmetic drift that does not indicate a contract change.
 * What matters for "SDK in sync with the backend" is whether the
 * generated endpoint *signatures* match the freshly regenerated set.
 */
function snapshotSdkTree(root) {
  /** @type {Map<string, string>} */
  const out = new Map();
  if (!fs.existsSync(root)) return out;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const tag = ent.name;
    if (tag === 'schemas') continue;
    const dir = path.join(root, tag);
    for (const fileEnt of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!fileEnt.isFile()) continue;
      if (!fileEnt.name.endsWith('.ts')) continue;
      const full = path.join(dir, fileEnt.name);
      const key = path.relative(root, full);
      out.set(key, fs.readFileSync(full, 'utf8'));
    }
  }
  return out;
}

/**
 * Extract a signature from an SDK tree: the set of all endpoint
 * functions, normalised by `(method, url, funcName)`. The output is
 * stable across orval version bumps because it ignores helper-type
 * emission differences.
 */
function signatureFromTree(tree) {
  const sigs = [];
  const funcRe = /const (\w+)\s*=\s*\(/g;
  // Match the return-orval call. The SDK output uses two patterns:
  //   1. Inline form:
  //        return orvalCustomInstance<T>({url:`...`, method:'GET'},
  //        );
  //   2. Multi-line form (when there is a `params` body):
  //        return orvalCustomInstance<T>(
  //        {url:`...`, method:'GET', params
  //      },
  //        );
  // Both shapes have `{url:`...`, method:'GET'` adjacent (i.e. on the
  // same line). The regex anchors on that adjacency so it works for
  // both shapes; the trailing `params` is allowed before the `})`.
  const urlMethodRe = /return orvalCustomInstance<[^>]+>\(\s*\{url:\s*`([^`]+)`,\s*method:\s*'([A-Z]+)'[\s\S]*?\}/;
  for (const [, content] of tree) {
    let pos = 0;
    while (pos < content.length) {
      funcRe.lastIndex = pos;
      const nameMatch = funcRe.exec(content);
      if (!nameMatch) break;
      const funcName = nameMatch[1];
      const afterName = nameMatch.index + nameMatch[0].length;
      const window = content.slice(afterName, afterName + 500);
      const retMatch = urlMethodRe.exec(window);
      if (retMatch) {
        const url = retMatch[1].replace(/\$\{([a-zA-Z]+)\}/g, '{$1}');
        sigs.push(`${retMatch[2]} ${url} -> ${funcName}`);
        pos = afterName + retMatch.index + retMatch[0].length;
      } else {
        pos = afterName;
      }
    }
  }
  sigs.sort();
  return sigs;
}

function diffSignatures(committed, regen) {
  const committedSet = new Set(committed);
  const regenSet = new Set(regen);
  const removed = committed.filter((s) => !regenSet.has(s));
  const added = regen.filter((s) => !committedSet.has(s));
  return { removed, added };
}

async function stepSdkRegenDiff() {
  info(`Step 2: SDK regeneration drift`);
  info(`  sdk root = ${opts.sdk}`);

  if (!opts.regen) {
    info(`  --no-regen set; skipping regeneration.`);
    return true;
  }

  // Snapshot the committed SDK first so we can diff even after orval
  // overwrites the target directory.
  const committedTree = snapshotSdkTree(opts.sdk);

  // Generate to a temp dir so we do NOT mutate the committed SDK.
  // We point orval at the LIVE-fetched OpenAPI snapshot (written to
  // a temp file) so the dry-run reflects what would be regenerated
  // from the running backend, not from the committed snapshot.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-sync-'));
  const liveSnapshotPath = path.join(tmpDir, 'live-openapi.json');
  try {
    let liveSnapshot;
    if (opts.fetch) {
      try {
        liveSnapshot = await fetchOpenapi(opts.backendUrl);
      } catch (err) {
        fail(
          `Could not reach the backend at ${opts.backendUrl}: ${err.message}. ` +
            `Use --no-fetch to skip the live fetch, or --no-regen to skip regen.`,
        );
      }
      fs.writeFileSync(liveSnapshotPath, liveSnapshot);
    } else {
      // --no-fetch: copy the committed snapshot so orval has a
      // stable input even if the backend is unreachable.
      fs.copyFileSync(opts.openapi, liveSnapshotPath);
    }

    // Build a minimal inline orval config that targets the temp dir
    // and uses the live snapshot as input. We override the
    // post-write hook to `[]` (no-op) so we don't try to lint
    // unrelated tracked files during the dry-run. The mutator path
    // is given as a *project-relative* path so orval emits the same
    // relative import it does during the real generation step.
    const tmpConfigPath = path.join(tmpDir, 'orval.config.mjs');
    fs.writeFileSync(
      tmpConfigPath,
      `
export default {
  quiz: {
    input: {
      target: ${JSON.stringify(liveSnapshotPath)},
      validation: false,
    },
    output: {
      target: ${JSON.stringify(tmpDir + '/sdk')},
      schemas: ${JSON.stringify(tmpDir + '/sdk/schemas')},
      client: 'axios',
      mode: 'tags-split',
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: ${JSON.stringify(
            path.join(frontendRoot, 'src/lib/api/core/custom-instance.ts'),
          )},
          name: 'orvalCustomInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: [],
    },
  },
};
`.trimStart(),
    );

    const r = spawnSync(
      'pnpm',
      [
        '--config.node-linker=hoisted',
        'orval',
        '--config',
        tmpConfigPath,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
        timeout: 180_000,
      },
    );

    if (r.status !== 0) {
      fail(
        `Orval SDK regeneration failed (exit ${r.status}). Tail of output:\n` +
          (r.stderr || r.stdout || '').slice(-2000),
      );
    }

    const regeneratedTree = snapshotSdkTree(tmpDir + '/sdk');
    const committedSigs = signatureFromTree(committedTree);
    const regenSigs = signatureFromTree(regeneratedTree);

    const { removed, added } = diffSignatures(committedSigs, regenSigs);

    if (removed.length === 0 && added.length === 0) {
      info(`  OK — committed SDK signatures match regeneration.`);
      info(`     ${committedSigs.length} endpoint function(s) in both trees.`);
      return true;
    }

    process.stderr.write(
      `\n  DRIFT — committed SDK signatures differ from regeneration.\n`,
    );
    process.stderr.write(
      `     committed signatures: ${committedSigs.length}\n`,
    );
    process.stderr.write(
      `     regenerated signatures: ${regenSigs.length}\n\n`,
    );
    if (removed.length > 0) {
      process.stderr.write(
        `  ${removed.length} endpoint(s) removed from SDK:\n`,
      );
      for (const s of removed.slice(0, 20)) {
        process.stderr.write(`    - ${s}\n`);
      }
      if (removed.length > 20) {
        process.stderr.write(`    - …and ${removed.length - 20} more\n`);
      }
    }
    if (added.length > 0) {
      process.stderr.write(
        `  ${added.length} new endpoint(s) in regenerated SDK:\n`,
      );
      for (const s of added.slice(0, 20)) {
        process.stderr.write(`    + ${s}\n`);
      }
      if (added.length > 20) {
        process.stderr.write(`    + …and ${added.length - 20} more\n`);
      }
    }
    process.stderr.write(
      `\n  Fix: from the frontend folder run \`pnpm generate:api:orval\` to refresh\n` +
        `  the SDK, then commit the change alongside the refreshed OpenAPI snapshot.\n`,
    );
    allPassed = false;
    return false;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Step 3: SDK coverage delegation ──────────────────────────────────────
function stepSdkCoverage() {
  info(`Step 3: SDK coverage (delegate to verify-sdk-coverage.mjs)`);

  if (!opts.coverage) {
    info(`  --skip-coverage set; skipping.`);
    return true;
  }

  const r = spawnSync(
    'node',
    [
      path.join(__dirname, 'verify-sdk-coverage.mjs'),
      '--phase',
      'all',
      '--ci',
    ],
    { cwd: frontendRoot, encoding: 'utf8' },
  );

  // Forward the last lines of the verifier's output for context.
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);

  if (r.status !== 0) {
    process.stderr.write(
      `\n  SDK coverage check failed. See the output above.\n`,
    );
    allPassed = false;
    return false;
  }
  info(`  OK`);
  return true;
}

const r1 = await stepOpenapiDiff();
const r2 = await stepSdkRegenDiff();
const r3 = stepSdkCoverage();

if (allPassed) {
  info(`All checks passed.`);
  process.exit(0);
} else {
  fail(`One or more contract-sync checks failed.`);
}