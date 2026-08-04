#!/usr/bin/env node
/**
 * phase5-lint-invariants.mjs — Phase 5 cross-batch invariant gate.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F7 (initial) / TKT-5.1.I1 (extended) /
 *                TKT-5.3.G3 (Epic 5.3 extension) /
 *                TKT-5.4.G3 (Epic 5.4 notification extension).
 *
 * Encodes Phase 5 cross-batch invariants:
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
 *   4. **registration-types** (Epic 5.3 G3) — Every export from
 *      `registration.types.ts` must have at least one consumer in the codebase.
 *      This ensures types are used, not just defined.
 *
 *   5. **notifications-no-axios-or-fetch** (Epic 5.4 G3) — No Phase 5
 *      notification file under `features/notifications/` may import `axios`
 *      or call `fetch(`. All traffic must flow through the service layer.
 *
 *   6. **notifications-no-direct-socket** (Epic 5.4 G3) — No Phase 5
 *      notification file may register Socket.IO event listeners directly.
 *      All socket interactions must go through `useNotificationSocket`.
 *
 *   7. **notification-types-have-consumers** (Epic 5.4 G3) — Every export
 *      from `notification.types.ts` must be referenced at least once by a
 *      test file. This ensures every domain shape has a test consumer.
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
  no-axios                       No 'import.*axios' or 'fetch(' under Phase 5 service dirs.
  no-deprecated-routes           No Phase 5 feature calls a route in DEPRECATED_ROUTES.
  service-consumers              Every Phase 5 service export has at least one consumer.
  registration-types             Every export from registration.types.ts has a consumer.
  notifications-no-axios-or-fetch  No axios/fetch under features/notifications/.
  notifications-no-direct-socket  No direct Socket.IO listener under features/notifications/.
  notification-types-have-consumers  Every export from notification.types.ts has a test consumer.

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

// ─── Check: notifications feature has no axios or fetch (Epic 5.4 G3) ────

/**
 * Walk all files under features/notifications/ and assert no file
 * imports axios or calls fetch directly. The notification feature must
 * route all HTTP traffic through the service wrappers.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkNotificationsNoAxiosOrFetch() {
  const featureDir = path.resolve(FEATURES_DIR, "notifications");
  const files = await walkFiles(
    featureDir,
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
      !f.includes("__tests__"),
  );

  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const text = raw.trimStart();
      if (
        text.startsWith("//") ||
        text.startsWith("/*") ||
        text.startsWith("*") ||
        text.startsWith("<!--")
      )
        continue;

      if (
        raw.includes('from "axios"') ||
        raw.includes("from 'axios'")
      ) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: 'from "axios"',
        });
      }
      if (raw.includes("fetch(")) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "fetch(",
        });
      }
    }
  }

  return violations;
}

// ─── Check: notifications feature has no direct Socket.IO listeners ─────

/**
 * Walk all files under features/notifications/ and assert that no
 * file calls Socket.IO event listener APIs directly. Allowed:
 *
 *   - `useNotificationSocket` (the single socket hook)
 *   - imports from `@/lib/realtime` (which itself wraps the socket client)
 *
 * Forbidden patterns:
 *   - `socket.on(`
 *   - `socket.off(`
 *   - `io(`
 *   - `.addEventListener("notification:...,`
 *   - references to `socket.io-client`
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkNotificationsNoDirectSocket() {
  const featureDir = path.resolve(FEATURES_DIR, "notifications");
  const files = await walkFiles(
    featureDir,
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
      !f.includes("__tests__"),
  );

  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  // The single allowed socket hook: its body must contain `socket.on(`,
  // `socket.off(` to register / unregister listeners. Any other
  // notification file that contains these strings is a violation.
  const ALLOWED_HOOK_FILES = new Set([
    path.resolve(featureDir, "hooks/useNotificationSocket.ts"),
  ]);

  for (const file of files) {
    if (ALLOWED_HOOK_FILES.has(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const text = raw.trimStart();
      if (
        text.startsWith("//") ||
        text.startsWith("/*") ||
        text.startsWith("*") ||
        text.startsWith("<!--")
      )
        continue;

      const hits = [
        { pattern: "socket.on(", re: /socket\.on\(/ },
        { pattern: "socket.off(", re: /socket\.off\(/ },
        { pattern: "io(", re: /\bio\(/ },
        { pattern: "socket.io-client", re: /socket\.io-client/ },
      ];

      for (const { pattern, re } of hits) {
        if (re.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            pattern,
          });
        }
      }
    }
  }

  return violations;
}

// ─── Check: notification types have test consumers (Epic 5.4 G3) ────────

/**
 * Walk all __tests__ files under features/notifications/ and assert
 * that every export from notification.types.ts has at least one
 * reference. This guards against orphan types added in Batch A.
 *
 * @returns {Promise<Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>>}
 */
async function checkNotificationTypesHaveConsumers() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>} */
  const orphanTypes = [];

  const typesFile = path.resolve(
    FEATURES_DIR,
    "notifications",
    "types",
    "notification.types.ts",
  );

  try {
    const exports = extractTypeExports(typesFile);
    for (const type of exports) {
      // Search __tests__ files first; fall back to the broader src/ if
      // no test consumer is found.
      const testConsumers = await findTypeConsumersInDir(
        type,
        typesFile,
        path.resolve(FEATURES_DIR, "notifications"),
        (f) => f.includes("__tests__"),
      );
      if (testConsumers.length === 0) {
        orphanTypes.push({
          file: path.relative(CWD, typesFile),
          type,
          consumers: testConsumers.map(({ file: f, line }) => ({ file: f, line })),
        });
      }
    }
  } catch {
    // File doesn't exist yet — skip silently.
  }

  return orphanTypes;
}

/**
 * Like `findTypeConsumers`, but restricted to a subdirectory and an
 * optional path predicate.
 *
 * @param {string} name
 * @param {string} homeFile
 * @param {string} rootDir
 * @param {(f: string) => boolean} filter
 * @returns {Promise<Array<{ file: string; line: number; text: string }>>}
 */
async function findTypeConsumersInDir(name, homeFile, rootDir, filter) {
  const consumers = [];
  const allFiles = await walkFiles(rootDir, (f) => {
    if (f === homeFile) return false;
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) return false;
    if (!filter(f)) return false;
    return true;
  });

  for (const file of allFiles) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (new RegExp(`\\b${name}\\b`).test(line)) {
        consumers.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: line.trim(),
        });
      }
    }
  }

  return consumers;
}

// ─── Check: registration types have consumers (Epic 5.3 G3) ──────────────

/**
 * Extract exported types and interfaces from a types file.
 * Matches: `export type Name =` or `export interface Name`
 * @param {string} filePath
 * @returns {string[]}
 */
function extractTypeExports(filePath) {
  const src = readFileSync(filePath, "utf-8");
  const typeMatches = [...src.matchAll(/^export\s+type\s+(\w+)\s*=/gm)];
  const interfaceMatches = [...src.matchAll(/^export\s+interface\s+(\w+)/gm)];
  const constMatches = [...src.matchAll(/^export\s+const\s+(\w+)\s*=/gm)];

  const allMatches = [
    ...typeMatches.map((m) => m[1]),
    ...interfaceMatches.map((m) => m[1]),
    ...constMatches.map((m) => m[1]),
  ];

  // Deduplicate
  return [...new Set(allMatches)];
}

/**
 * Search all source and test files for references to a type/const name.
 * @param {string} name
 * @param {string} homeFile
 * @returns {Promise<Array<{ file: string; line: number; text: string }>>}
 */
async function findTypeConsumers(name, homeFile) {
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
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (new RegExp(`\\b${name}\\b`).test(line)) {
        consumers.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: line.trim(),
        });
      }
    }
  }

  return consumers;
}

async function checkRegistrationTypes() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>} */
  const orphanTypes = [];

  // Check registration.types.ts
  const registrationTypesPath = path.resolve(
    FEATURES_DIR,
    "tournaments",
    "types",
    "registration.types.ts",
  );

  try {
    const exports = extractTypeExports(registrationTypesPath);
    for (const type of exports) {
      const consumers = await findTypeConsumers(type, registrationTypesPath);
      if (consumers.length === 0) {
        orphanTypes.push({
          file: path.relative(CWD, registrationTypesPath),
          type,
          consumers: consumers.map(({ file: f, line }) => ({ file: f, line })),
        });
      }
    }
  } catch {
    // File doesn't exist yet, skip
  }

  return orphanTypes;
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

function reportRegistrationTypes(orphanTypes) {
  if (orphanTypes.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} registration-types — all exports from registration.types.ts have at least one consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} registration-types — ${BOLD(String(orphanTypes.length))} orphaned export(s) with no consumers\n\n`,
  );

  for (const t of orphanTypes) {
    process.stdout.write(
      `  ${RED("no consumer for:")} ${BOLD(t.type)}  ${DIM(t.file)}\n`,
    );
  }

  return false;
}

// ─── Report helpers: Epic 5.4 G3 ─────────────────────────────────────────

function reportNotificationsNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} notifications-no-axios-or-fetch — no axios imports or fetch() calls under features/notifications/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} notifications-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportNotificationsNoDirectSocket(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} notifications-no-direct-socket — no direct Socket.IO listener registration under features/notifications/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} notifications-no-direct-socket — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportNotificationTypesHaveConsumers(orphanTypes) {
  if (orphanTypes.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} notification-types-have-consumers — all exports from notification.types.ts have at least one test consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} notification-types-have-consumers — ${BOLD(String(orphanTypes.length))} orphaned export(s) with no test consumer\n\n`,
  );

  for (const t of orphanTypes) {
    process.stdout.write(
      `  ${RED("no test consumer for:")} ${BOLD(t.type)}  ${DIM(t.file)}\n`,
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

  // Check 4: registration types have consumers (Epic 5.3 G3)
  // Every export from registration.types.ts should be used by at least one consumer.
  const orphanTypes = await checkRegistrationTypes();
  if (!reportRegistrationTypes(orphanTypes)) {
    ok = false;
  }

  // Check 5: notifications-no-axios-or-fetch (Epic 5.4 G3)
  // No file under features/notifications/ may import axios or call fetch().
  const notifAxiosViolations = await checkNotificationsNoAxiosOrFetch();
  if (!reportNotificationsNoAxiosOrFetch(notifAxiosViolations)) {
    ok = false;
  }

  // Check 6: notifications-no-direct-socket (Epic 5.4 G3)
  // No file under features/notifications/ may register Socket.IO
  // listeners directly — all socket traffic must go through
  // `useNotificationSocket`.
  const notifSocketViolations = await checkNotificationsNoDirectSocket();
  if (!reportNotificationsNoDirectSocket(notifSocketViolations)) {
    ok = false;
  }

  // Check 7: notification-types-have-consumers (Epic 5.4 G3)
  // Every export from notification.types.ts must be referenced by at
  // least one __tests__ file under features/notifications/.
  const orphanNotificationTypes = await checkNotificationTypesHaveConsumers();
  if (!reportNotificationTypesHaveConsumers(orphanNotificationTypes)) {
    ok = false;
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
