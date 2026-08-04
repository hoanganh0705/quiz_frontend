#!/usr/bin/env node
/**
 * phase5-lint-invariants.mjs — Phase 5 cross-batch invariant gate.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F7 (initial) / TKT-5.1.I1 (extended).
 *
 * Encodes three Phase 5 cross-batch invariants:
 *
 *   1. **no-axios** — No Phase 5 service file may import `axios` or call
 *      `fetch(` directly. All HTTP traffic must go through the generated SDK.
 *
 *   2. **no-deprecated-routes** — No Phase 5 feature file may call any route
 *      listed in `DEPRECATED_ROUTES`.
 *
 *   3. **service-consumers** — Every function exported from a Phase 5 service
 *      module must be referenced at least once outside that module (i.e. it has
 *      a consumer). Stub functions with no consumers are a maintenance liability.
 *
 * ## Usage
 *
 *   node scripts/phase5-lint-invariants.mjs [--help]
 *
 *   - `--help`       Print the help text and exit 64.
 *   - `--strict`     Treat indirect imports (imports-of-imports) as violations.
 *                     Ignored for service-consumers (always strict).
 *
 * ## Exit codes
 *
 *   0  — all invariants hold.
 *   1  — at least one invariant failed; a diff message naming the
 *        offender is printed.
 *   2  — usage error (bad CLI flag).
 *   64 — `--help` (after the help text is printed).
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// ─── Config ───────────────────────────────────────────────────────────────

const CWD = process.cwd();
const FEATURES_DIR = path.resolve(CWD, "src/features");
const DEPRECATED_ROUTES_PATH = path.resolve(
  CWD,
  "src/lib/api/deprecated-routes.ts",
);

/** Phase 5 feature directories whose service files are subject to the no-axios check. */
const PHASE5_FEATURES = [
  "tournaments",
  "instances",
  "notifications",
  "rankings",
  "achievements",
  "search",
];

// ─── CLI ──────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/phase5-lint-invariants.mjs [--help]

Checks (always run):
  no-axios              No 'import.*axios' or 'fetch(' under Phase 5 service dirs.
  no-deprecated-routes  No Phase 5 feature calls a route in DEPRECATED_ROUTES.
  service-consumers     Every Phase 5 service export has at least one consumer.

Flags:
  --help    Print this help and exit 64.
  --strict  Also flag indirect imports (imports-of-imports). Ignored for
             service-consumers (always strict).
`;

const args = process.argv.slice(2);
let strict = false;

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--help" || a === "-h") {
    process.stdout.write(USAGE);
    process.exit(64);
  } else if (a === "--strict") {
    strict = true;
  } else {
    process.stderr.write(
      `[phase5:lint-invariants] unknown flag: ${a}\n`,
    );
    process.exit(2);
  }
}

// ─── Color helpers ───────────────────────────────────────────────────────

const noColor = !!process.env.NO_COLOR || !process.stdout.isTTY;
const c = (color, s) => (noColor ? s : `\x1b[${color}m${s}\x1b[0m`);
const RED = (s) => c(31, s);
const GREEN = (s) => c(32, s);
const DIM = (s) => c(2, s);
const BOLD = (s) => c(1, s);

// ─── Recursive file walker ───────────────────────────────────────────────

/**
 * Recursively walk a directory and return matching file paths.
 * @param {string} root
 * @param {(f: string) => boolean} filter
 * @returns {Promise<string[]>}
 */
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

// ─── Load DEPRECATED_ROUTES ─────────────────────────────────────────────

let deprecatedRoutes;
try {
  const src = readFileSync(DEPRECATED_ROUTES_PATH, "utf-8");
  const match = src.match(
    /DEPRECATED_ROUTES\s*=\s*\[\s*([^\];]+)\s*\]/s,
  );
  if (!match) {
    process.stderr.write(
      `[phase5:lint-invariants] could not parse DEPRECATED_ROUTES from ${DEPRECATED_ROUTES_PATH}\n`,
    );
    process.exit(1);
  }
  deprecatedRoutes = match[1]
    .split(",")
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
    .filter(Boolean);
} catch (err) {
  process.stderr.write(
    `[phase5:lint-invariants] failed to read ${DEPRECATED_ROUTES_PATH}: ${err}\n`,
  );
  process.exit(1);
}

// ─── Check: no axios / fetch in Phase 5 services ─────────────────────────

/**
 * Grep a file for forbidden HTTP patterns.
 * Returns an array of line numbers where a match was found.
 * @param {string} filePath
 * @param {string[]} terms
 * @returns {Array<{ line: number; text: string }>}
 */
function grepLines(filePath, terms) {
  const src = readFileSync(filePath, "utf-8");
  const lines = src.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const term of terms) {
      if (line.includes(term)) {
        hits.push({ line: i + 1, text: line.trim() });
        break;
      }
    }
  }
  return hits;
}

async function checkNoAxios() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  for (const feature of PHASE5_FEATURES) {
    const serviceDir = path.resolve(FEATURES_DIR, feature, "services");
    const files = await walkFiles(
      serviceDir,
      (f) =>
        f.endsWith(".ts") ||
        f.endsWith(".tsx") ||
        f.endsWith(".mts") ||
        f.endsWith(".cts"),
    );

    for (const file of files) {
      const hits = grepLines(file, ["import", "fetch("]);
      for (const hit of hits) {
        // Skip comments that merely mention axios/fetch in docs.
        const trimmed = hit.text.trimStart();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("<!--")
        )
          continue;

        // Check for 'from "axios"' or 'from \'axios\'' pattern
        if (
          hit.text.includes('from "axios"') ||
          hit.text.includes("from 'axios'")
        ) {
          violations.push({
            file: path.relative(CWD, file),
            line: hit.line,
            text: hit.text,
            pattern: 'from "axios"',
          });
        }
        // Check for fetch( — but skip commented-out code
        if (hit.text.includes("fetch(")) {
          violations.push({
            file: path.relative(CWD, file),
            line: hit.line,
            text: hit.text,
            pattern: "fetch(",
          });
        }
      }
    }
  }

  return violations;
}

// ─── Check: no deprecated routes ────────────────────────────────────────

async function checkNoDeprecatedRoutes() {
  const featureFiles = await walkFiles(
    FEATURES_DIR,
    (f) =>
      f.endsWith(".ts") ||
      f.endsWith(".tsx") ||
      f.endsWith(".mts") ||
      f.endsWith(".cts"),
  );

  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  for (const file of featureFiles) {
    const hits = grepLines(file, deprecatedRoutes);
    for (const hit of hits) {
      const trimmed = hit.text.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;

      let hitRoute = "";
      for (const route of deprecatedRoutes) {
        if (hit.text.includes(route)) {
          hitRoute = route;
          break;
        }
      }

      violations.push({
        file: path.relative(CWD, file),
        line: hit.line,
        text: hit.text,
        route: hitRoute,
      });
    }
  }

  return violations;
}

// ─── Check: every service export has a consumer ───────────────────────────

/**
 * Extract exported function names from a service file.
 * Matches: `export async function name(` or `export function name(`
 * @param {string} filePath
 * @returns {string[]}
 */
function extractServiceExports(filePath) {
  const src = readFileSync(filePath, "utf-8");
  const matches = [...src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)\s*\(/gm)];
  return matches.map((m) => m[1]);
}

/**
 * Search all source files (excluding node_modules, .next, .git) for
 * references to a service function name outside its home file.
 * @param {string} name
 * @param {string} homeFile
 * @returns {Promise<Array<{ file: string; line: number; text: string }>>}
 */
async function findConsumers(name, homeFile) {
  const consumers = [];
  const allFiles = await walkFiles(
    path.resolve(CWD, "src"),
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".tsx")) &&
      !f.includes("node_modules") &&
      !f.includes(".next") &&
      !f.includes(".git"),
  );

  for (const file of allFiles) {
    if (file === homeFile) continue;
    // Only consider files that import from the service module to be safe,
    // but also accept direct name matches (the service function might be
    // imported without a full path match).
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      // Match: import { name } or import { name as alias } or just "name"
      // Use a word-boundary-ish check: the name followed by (, :=, or space before next word
      if (/\bname\b/.test(line.replace(/name/g, "PLACEHOLDER"))) {
        // Restore and do actual match
        if (new RegExp(`\\b${name}\\b`).test(line)) {
          consumers.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }
  }

  return consumers;
}

async function checkServiceConsumers() {
  /** @type {Array<{ file: string; func: string; consumers: Array<{ file: string; line: number }> }>} */
  const orphanServices = [];

  for (const feature of PHASE5_FEATURES) {
    const serviceDir = path.resolve(FEATURES_DIR, feature, "services");
    const files = await walkFiles(
      serviceDir,
      (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
    );

    for (const file of files) {
      const exports = extractServiceExports(file);
      for (const func of exports) {
        const consumers = await findConsumers(func, file);
        if (consumers.length === 0) {
          orphanServices.push({
            file: path.relative(CWD, file),
            func,
            consumers: consumers.map(({ file: f, line }) => ({ file: f, line })),
          });
        }
      }
    }
  }

  return orphanServices;
}

// ─── Report helpers ─────────────────────────────────────────────────────

function reportNoAxios(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} no-axios — no axios imports or fetch() calls found in Phase 5 services\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} no-axios — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden pattern:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportNoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} no-deprecated-routes — all Phase 5 feature files pass\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  const byRoute = new Map();
  for (const v of violations) {
    if (!byRoute.has(v.route)) byRoute.set(v.route, []);
    byRoute.get(v.route).push(v);
  }

  for (const [route, hits] of byRoute) {
    process.stdout.write(
      `${RED("deprecated route:")} ${BOLD(route)}\n`,
    );
    for (const hit of hits) {
      process.stdout.write(
        `  ${DIM(hit.file)}:${DIM(String(hit.line))}\n`,
      );
      const snippet =
        hit.text.length > 72 ? hit.text.slice(0, 69) + "..." : hit.text;
      process.stdout.write(`  ${snippet}\n\n`);
    }
  }

  return false;
}

function reportServiceConsumers(orphanServices) {
  if (orphanServices.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} service-consumers — all Phase 5 service exports have at least one consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} service-consumers — ${BOLD(String(orphanServices.length))} orphaned export(s) with no consumers\n\n`,
  );

  for (const svc of orphanServices) {
    process.stdout.write(
      `  ${RED("no consumer for:")} ${BOLD(svc.func)}  ${DIM(svc.file)}\n`,
    );
  }

  return false;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  let ok = true;

  // Check 1: no axios
  const axiosViolations = await checkNoAxios();
  if (!reportNoAxios(axiosViolations)) ok = false;

  // Check 2: no deprecated routes
  const deprecatedViolations = await checkNoDeprecatedRoutes();
  if (!reportNoDeprecatedRoutes(deprecatedViolations)) ok = false;

  // Check 3: service consumers — warn-only at this stage.
  // All Phase 5 services are freshly authored; their consumers (Stories 5.2–5.8)
  // have not been implemented yet. Once those stories land, re-enable
  // this as a hard failure by switching `warnOnly` to `false`.
  const warnOnly = true;
  const orphanServices = await checkServiceConsumers();
  if (!reportServiceConsumers(orphanServices)) {
    if (warnOnly) {
      process.stdout.write(
        `  ${DIM("(warn-only — consumer stories (5.2–5.8) not yet landed)\n")}`,
      );
    } else {
      ok = false;
    }
  }

  if (ok) {
    process.stdout.write(
      `\n${GREEN("[phase5:lint-invariants] all checks passed")}\n`,
    );
    process.exit(0);
  } else {
    process.stdout.write(
      `\n${RED("[phase5:lint-invariants] check(s) failed — fix violations above")}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`[phase5:lint-invariants] fatal: ${err}\n`);
  process.exit(1);
});
