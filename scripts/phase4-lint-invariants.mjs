#!/usr/bin/env node
/**
 * phase4-lint-invariants.mjs — Phase 4 cross-cutting invariant gate.
 *
 * Encodes the three cross-batch invariants that the master plan calls
 * out as the "Phase 4 done" gate (PHASE_4_EPICS.md §16 lines 192–198
 * and the `Epic Done Checklist` in EPIC_4_1_TICKETS.md lines 760–774).
 *
 *   1. **No axios / no fetch in Phase 4 features.** The cross-feature
 *      bookkeeping in `src/features/{quizzes,bookmarks,reviews,comments,attempts,users}/`
 *      must not import `axios` directly or call `fetch(` — every
 *      network call must go through the generated SDK builder under
 *      `@/lib/api`.
 *
 *   2. **No `data` / `meta` envelope leaks.** Components under
 *      `src/features/<feature>/components/` must not read the
 *      post-unwrap `data` or `meta` keys directly. The Phase 3
 *      contract (and the master plan lines 294–314) put the
 *      envelope unwrap in the service layer; components should
 *      consume the narrowed DTO. The `app/(*)` route components
 *      are exempt (the route boundary is the only consumer that
 *      is allowed to read `data` for the no-data fallback).
 *
 *   3. **Every Phase 4 endpoint has at least one consumer.** For
 *      each `(method, path)` pair in the Phase 4 slice, at least one
 *      file under `src/features/<feature>/` must reference the
 *      corresponding SDK function. This is the same "consumers"
 *      check that `verify-sdk-coverage.mjs --check all` runs, but
 *      exposed as a first-class command for the Phase 4 done gate.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.I1.
 *
 * ## Default checks
 *
 * The three invariants the master plan calls out are split into two
 * tiers so the script can be wired into a fast pre-PR gate today
 * and a fuller forward-looking gate later (after the F-batch
 * consumer work lands):
 *
 *   - **Always run (default):** `no-axios` and `no-leaks`. These are
 *     the structural invariants that the F-batch cannot regress; if
 *     either fails the script exits non-zero.
 *
 *   - **Opt-in (--check consumers or --strict):** `consumers`. This
 *     asserts every Phase 4 endpoint has at least one consumer in
 *     `src/features/<phase4>/`. It mirrors
 *     `verify-sdk-coverage.mjs --check all` (TKT-4.1.A2). It is
 *     intentionally NOT default-on because the consumer work for
 *     many Phase 4 endpoints lives in stories 4.2–4.15 (out of
 *     Story 4.1's scope).
 *
 * ## Exit codes
 *
 *   0 — all enabled checks passed
 *   1 — one or more enabled checks failed (a diff message is printed)
 *   2 — usage error (bad CLI flag)
 *   64 — `--help` (after the help text is printed)
 */

import { readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// ─── CLI ──────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/phase4-lint-invariants.mjs [--check <name>] [--strict] [--help]

Default checks (always run):
  no-axios       No \`from 'axios'\` or \`fetch(\` under the seven Phase 4 features.
  no-leaks       No \`data\` / \`meta\` envelope reads under src/features/<feature>/components/.

Opt-in check (requires --check consumers OR --strict):
  consumers      Every Phase 4 endpoint has at least one consumer in src/features/<feature>/.

Flags:
  --check <name>  Run only the named check (repeatable).
  --strict        Enable ALL checks, including consumers.
  --users-only    Run only the users feature checks (shortcut for --check no-axios --check no-leaks).
  --openapi <p>   Override the OpenAPI artifact path.
  --features <d>  Override the features directory root.
  --sdk <d>       Override the generated SDK directory.
  --help          Print this help and exit 64.
`;

const args = process.argv.slice(2);
let openapiPath = path.resolve(
  process.cwd(),
  "../quiz_backend/docs/generated/openapi.json",
);
let featuresDir = path.resolve(process.cwd(), "src/features");
let sdkDir = path.resolve(process.cwd(), "src/lib/api/generated");
const selectedChecks = new Set();

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--help" || a === "-h") {
    process.stdout.write(USAGE);
    process.exit(64);
  } else if (a === "--check") {
    const name = args[++i];
    if (!name) {
      process.stderr.write("[phase4:lint-invariants] missing --check value\n");
      process.exit(2);
    }
    selectedChecks.add(name);
  } else if (a.startsWith("--check=")) {
    selectedChecks.add(a.slice("--check=".length));
  } else if (a === "--openapi") {
    openapiPath = path.resolve(process.cwd(), args[++i]);
  } else if (a === "--features") {
    featuresDir = path.resolve(process.cwd(), args[++i]);
  } else if (a === "--sdk") {
    sdkDir = path.resolve(process.cwd(), args[++i]);
  } else if (a === "--users-only") {
    selectedChecks.add("users-only");
  } else if (a === "--strict") {
    // Late-applied in the strict-detection pass below.
  } else {
    process.stderr.write(`[phase4:lint-invariants] unknown flag: ${a}\n`);
    process.exit(2);
  }
}

const RUN_ALL = selectedChecks.size === 0;
let strict = false;
let usersOnly = false;
for (const a of args) {
  if (a === "--strict") strict = true;
  if (a === "--users-only") usersOnly = true;
}

const checks = [
  ["no-axios", RUN_ALL || selectedChecks.has("no-axios") || usersOnly],
  ["no-leaks", RUN_ALL || selectedChecks.has("no-leaks") || usersOnly],
  ["consumers", strict || selectedChecks.has("consumers")],
];

// ─── Color helpers ───────────────────────────────────────────────────

const noColor = !!process.env.NO_COLOR || !process.stdout.isTTY;
const c = (color, s) => (noColor ? s : `\x1b[${color}m${s}\x1b[0m`);
const RED = (s) => c(31, s);
const GREEN = (s) => c(32, s);
const DIM = (s) => c(2, s);
const BOLD = (s) => c(1, s);

// ─── Phase 4 slice (mirror of verify-sdk-coverage.mjs) ───────────────

const PHASE4_PATH_PREFIXES = [
  "/api/v1/attempts/",
  "/api/v1/bookmarks/",
  "/api/v1/comments/",
  "/api/v1/quizzes/",
  "/api/v1/reviews/",
  "/api/v1/users/",
];
const isPhase4Path = (p) =>
  PHASE4_PATH_PREFIXES.some((pre) => p.startsWith(pre));

const PHASE4_FEATURES = [
  "quizzes",
  "bookmarks",
  "reviews",
  "comments",
  "attempts",
  "users",
];

// When --users-only is set, scope all checks to the users feature only.
const targetFeatures = usersOnly ? ["users"] : PHASE4_FEATURES;

// ─── Recursive file walker ───────────────────────────────────────────

async function walkFiles(root, filter = () => true) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (
          e.name === "node_modules" ||
          e.name === ".next" ||
          e.name === ".git"
        )
          continue;
        stack.push(full);
      } else if (e.isFile() && filter(full)) {
        out.push(full);
      }
    }
  }
  return out;
}

// ─── Check 1: no axios / no fetch in Phase 4 features ─────────────────

async function checkNoAxios() {
  const offenders = [];
  for (const feature of targetFeatures) {
    const root = path.join(featuresDir, feature);
    try {
      statSync(root);
    } catch {
      continue;
    }
    const files = await walkFiles(
      root,
      (f) => /\.(ts|tsx|mjs|js)$/.test(f) && !/\.spec\.tsx?$/.test(f),
    );
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const stripped = line.trim();
        // Skip JSDoc lines (`* …`) and line/block comments
        if (stripped.startsWith("*") || stripped.startsWith("//")) continue;
        if (
          /from\s+['"]axios['"]/.test(line) ||
          /require\(['"]axios['"]\)/.test(line)
        ) {
          offenders.push({
            file: f,
            line: i + 1,
            snippet: line.trim(),
            kind: "axios-import",
          });
        }
        if (/\bfetch\s*\(/.test(line)) {
          // The contract is strict: no `fetch(` anywhere in a feature file
          // EXCEPT in JSDoc comments (which are stripped above).
          offenders.push({
            file: f,
            line: i + 1,
            snippet: line.trim(),
            kind: "fetch-call",
          });
        }
      }
    }
  }
  return offenders;
}

// ─── Check 2: no envelope leaks under components/ ────────────────────

const LEAK_PATTERNS = [
  // `.data?.…` / `.data.foo` / `.data!!` / `?.data.foo`
  /\bresult\.data\b(?!\s*\|\|\s*null)/,
  /\bresponse\.data\b/,
  /\bresult\.meta\b/,
  /\bresponse\.meta\b/,
];

async function checkNoLeaks() {
  const offenders = [];
  // When --users-only, scope to features/users only; otherwise all Phase 4 features.
  const leakRoot = usersOnly
    ? path.join(featuresDir, "users")
    : featuresDir;
  // Scope: any .ts/.tsx file under src/features/**/components/**
  // (recursive). App routes are excluded.
  const files = await walkFiles(
    leakRoot,
    (f) =>
      /\.(ts|tsx)$/.test(f) &&
      !/\.spec\.tsx?$/.test(f) &&
      /\/components\//.test(f),
  );
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      for (const pat of LEAK_PATTERNS) {
        if (pat.test(line)) {
          offenders.push({
            file: f,
            line: i + 1,
            snippet: line.trim(),
            pattern: pat.toString(),
          });
        }
      }
    }
  }
  return offenders;
}

// ─── Check 3: every Phase 4 endpoint has at least one consumer ───────

async function loadOpenApiPhase4() {
  let raw;
  try {
    raw = readFileSync(openapiPath, "utf8");
  } catch (err) {
    process.stderr.write(
      `[phase4:lint-invariants] cannot read OpenAPI artifact at ${openapiPath}: ${err.message}\n`,
    );
    process.exit(2);
  }
  const doc = JSON.parse(raw);
  const pairs = [];
  for (const [path, methods] of Object.entries(doc.paths ?? {})) {
    if (!isPhase4Path(path)) continue;
    for (const m of Object.keys(methods)) {
      if (["get", "post", "put", "patch", "delete"].includes(m.toLowerCase())) {
        pairs.push({ method: m.toUpperCase(), path });
      }
    }
  }
  return pairs;
}

function methodJSDocComment(filepath, methodUpper, pathStr) {
  // Search for the SDK function whose JSDoc pattern matches the
  // (method, path) pair. We use the same regex strategy as
  // verify-sdk-coverage.mjs — a function declared with
  // `const <name> = (...)` whose body contains
  // `url: '<path>', method: '<METHOD>'`.
  let src;
  try {
    src = readFileSync(filepath, "utf8");
  } catch {
    return null;
  }
  // Normalize path params: {quizId} → :quizId, etc.
  const rePath = pathStr.replace(/\{/g, "${").replace(/\}/g, "}");
  const escMethod = methodUpper.toLowerCase();
  const reUrl = new RegExp(
    `url:[\\s\`'"]+/?[^\`'",]*?${rePath.replace(/\$/g, "\\$").replace(/\//g, "\\/")}[^\`'",]*[\\s\`'"]*[,]?`,
  );
  const reMethod = new RegExp(`method:[\\s\`'"]*${escMethod}[\\s\`'"]*`);
  if (reUrl.test(src) && reMethod.test(src)) {
    // Find the function name by the first `const <name> = (` before
    // the URL comment.
    const idx = src.search(reUrl);
    const before = src.slice(0, idx);
    const nameMatch = /const\s+(\w+)\s*=\s*\(/.exec(before);
    return nameMatch ? nameMatch[1] : null;
  }
  return null;
}

async function indexSdkFunctions() {
  /** @type {Map<string, string[]>} keyed by `${method}:${path}` */
  const index = new Map();
  const files = await walkFiles(
    sdkDir,
    (f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"),
  );
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    // Match each function declaration that ends in an
    // `orvalCustomInstance<...>({ ... url: '...', method: '...' ... })`
    // call. The function `url` and `method` keys may be on separate
    // lines, so we use a [\s\S]*?  non-greedy scan between `url:`
    // and `method:` (within reasonable bounds).
    //
    // The function name is the `const <name> = (` (or `(...) =>` /\n) that
    // precedes the `orvalCustomInstance` call. We do this by scanning
    // every function declaration and looking back from the body.
    const funcDeclRe =
      /const\s+(\w+)\s*=\s*\([\s\S]*?orvalCustomInstance[\s\S]*?\)/g;
    let m;
    while ((m = funcDeclRe.exec(src)) !== null) {
      const name = m[1];
      const body = m[0];
      // Pick out the FIRST `url:` and `method:` keys from the body.
      const urlMatch = /url:\s*[`'"]([^`'"]+)[`'"]/.exec(body);
      const methodMatch = /method:\s*[`'"]([a-z]+)[`'"]/i.exec(body);
      if (!urlMatch || !methodMatch) continue;
      const url = urlMatch[1];
      const method = methodMatch[1].toUpperCase();
      const normalized = url.replace(/\$\{([^}]+)\}/g, "{$1}");
      if (!isPhase4Path(normalized)) continue;
      const key = `${method}:${normalized}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(name);
    }
  }
  return index;
}

async function checkConsumers(sdkIndex) {
  // Walk src/features/** (excluding tests) and record every SDK
  // function name that appears in an import.
  const files = await walkFiles(
    featuresDir,
    (f) => /\.(ts|tsx)$/.test(f) && !/\.spec\.tsx?$/.test(f),
  );
  const usage = new Map();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const names of sdkIndex.values()) {
      for (const n of names) {
        const re = new RegExp(`\\b${n}\\b`);
        if (re.test(src)) {
          usage.set(n, (usage.get(n) ?? 0) + 1);
        }
      }
    }
  }
  return usage;
}

// ─── Main ────────────────────────────────────────────────────────────

function header(s) {
  process.stdout.write(`\n${BOLD(s)}\n`);
}

async function main() {
  let exitCode = 0;
  const summary = [];

  // ─── Check 1 ───────────────────────────────────────────────────────
  if (checks.find(([name, on]) => on && name === "no-axios")?.[1]) {
    header("check 1: no axios / fetch in Phase 4 features");
    const offenders = await checkNoAxios();
    if (offenders.length === 0) {
      process.stdout.write(
        `${GREEN("  OK")} — 0 hits across the six Phase 4 features.\n`,
      );
      summary.push({ name: "no-axios", ok: true });
    } else {
      process.stdout.write(`${RED("  FAIL")} — ${offenders.length} hit(s):\n`);
      for (const o of offenders.slice(0, 20)) {
        const rel = path.relative(process.cwd(), o.file);
        process.stdout.write(
          `    ${rel}:${o.line} [${o.kind}] ${DIM(o.snippet)}\n`,
        );
      }
      if (offenders.length > 20) {
        process.stdout.write(
          `    ${DIM(`(+${offenders.length - 20} more)`)}\n`,
        );
      }
      summary.push({ name: "no-axios", ok: false });
      exitCode = 1;
    }
  }

  // ─── Check 2 ───────────────────────────────────────────────────────
  if (checks.find(([name, on]) => on && name === "no-leaks")?.[1]) {
    header("check 2: no envelope leaks under src/features/**/components/");
    const offenders = await checkNoLeaks();
    if (offenders.length === 0) {
      process.stdout.write(
        `${GREEN("  OK")} — 0 hits across Phase 4 components.\n`,
      );
      summary.push({ name: "no-leaks", ok: true });
    } else {
      process.stdout.write(`${RED("  FAIL")} — ${offenders.length} hit(s):\n`);
      for (const o of offenders.slice(0, 20)) {
        const rel = path.relative(process.cwd(), o.file);
        process.stdout.write(
          `    ${rel}:${o.line} pattern=${o.pattern} ${DIM(o.snippet)}\n`,
        );
      }
      if (offenders.length > 20) {
        process.stdout.write(
          `    ${DIM(`(+${offenders.length - 20} more)`)}\n`,
        );
      }
      summary.push({ name: "no-leaks", ok: false });
      exitCode = 1;
    }
  }

  // ─── Check 3 ───────────────────────────────────────────────────────
  if (checks.find(([name, on]) => on && name === "consumers")?.[1]) {
    header("check 3: every Phase 4 endpoint has at least one consumer");
    const pairs = await loadOpenApiPhase4();
    const sdkIndex = await indexSdkFunctions();
    const usage = await checkConsumers(sdkIndex);

    const missing = [];
    for (const { method, path: p } of pairs) {
      const key = `${method}:${p}`;
      const fns = sdkIndex.get(key) ?? [];
      if (fns.length === 0) {
        missing.push({ method, path: p, reason: "absent-from-sdk" });
        continue;
      }
      const anyUsed = fns.some((n) => (usage.get(n) ?? 0) > 0);
      if (!anyUsed) {
        missing.push({ method, path: p, reason: "no-consumer", fns });
      }
    }
    if (missing.length === 0) {
      process.stdout.write(
        `${GREEN("  OK")} — ${pairs.length}/${pairs.length} Phase 4 endpoints have at least one consumer.\n`,
      );
      summary.push({ name: "consumers", ok: true });
    } else {
      process.stdout.write(
        `${RED("  FAIL")} — ${missing.length} endpoint(s) without a consumer:\n`,
      );
      for (const m of missing.slice(0, 20)) {
        process.stdout.write(`    ${m.method} ${m.path} (${m.reason})\n`);
      }
      if (missing.length > 20) {
        process.stdout.write(`    ${DIM(`(+${missing.length - 20} more)`)}\n`);
      }
      summary.push({ name: "consumers", ok: false });
      exitCode = 1;
    }
  }

  // ─── Footer ───────────────────────────────────────────────────────
  header("summary");
  for (const s of summary) {
    const tag = s.ok ? GREEN("PASS") : RED("FAIL");
    process.stdout.write(`  ${tag}  ${s.name}\n`);
  }
  if (exitCode === 0) {
    process.stdout.write(`\n${GREEN("[phase4:lint-invariants] OK")}\n`);
  } else {
    process.stdout.write(
      `\n${RED("[phase4:lint-invariants] FAILED")} — see above for the diff.\n`,
    );
  }
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(
    `[phase4:lint-invariants] unexpected error: ${err.stack ?? err.message}\n`,
  );
  process.exit(1);
});
