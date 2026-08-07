#!/usr/bin/env node
/**
 * phase5-lint-invariants.mjs — Phase 5 cross-batch invariant gate.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F7 (initial) / TKT-5.1.I1 (extended) /
 *                TKT-5.3.G3 (Epic 5.3 extension) /
 *                TKT-5.4.G3 (Epic 5.4 notification extension) /
 *                TKT-5.5.G3 (Epic 5.5 rankings/achievements extension) /
 *                TKT-5.6.G3 (Epic 5.6 search extension) /
 *                TKT-5.8.H4 (Epic 5.8 gameplay extension).
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
 *   8. **rankings-achievements-no-axios-or-fetch** (Epic 5.5 G3) — No file
 *      under `features/rankings/` or `features/achievements/` (excluding
 *      `services/`) may import `axios` or call `fetch(`. All traffic
 *      must go through the service layer.
 *
 *   9. **rankings-achievements-no-analytics-widgets** (Epic 5.5 G3) — No
 *      component or page (`components/`, top-level route entry, or
 *      `__tests__/`) under `features/rankings/` or `features/achievements/`
 *      may import `getMyBadgeAnalytics` (or other analytics widgets
 *      known to return zeros). The flag stops those widgets from being
 *      accidentally surfaced before the dashboard lands.
 *
 *  10. **ranking-types-have-consumers** (Epic 5.5 G3) — Every export
 *      from `rankings/types/ranking.types.ts` must have at least one
 *      consumer under `features/rankings/` (covered by the broader
 *      search below).
 *
 *  11. **achievement-types-have-consumers** (Epic 5.5 G3) — Every export
 *      from `achievements/types/achievement.types.ts` must have at
 *      least one consumer under `features/achievements/`.
 *
 *  12. **useEventuallyConsistentQuery-has-tests** (Epic 5.5 G3) — The
 *      shared `useEventuallyConsistentQuery` primitive added in Batch C
 *      must have a unit test. The check fails if the test file in
 *      `features/rankings/hooks/__tests__/useEventuallyConsistentQuery.spec.tsx`
 *      is absent.
 *
 *  13. **search-no-axios-or-fetch** (Epic 5.6 G3) — No file under
 *      `features/search/` (excluding `services/`) may import `axios` or call
 *      `fetch(`. All traffic must flow through the service layer.
 *
 *  14. **search-no-social-write-dto** (Epic 5.6 G3) — No file under
 *      `features/search/` may import `FriendRequestDto` or `FollowDto`.
 *      Only read-only social DTOs are permitted.
 *
 *  15. **search-no-unstable-social-ids** (Epic 5.6 G3) — No file under
 *      `features/search/` may reference `followId` or `friendshipId` in
 *      string literals (hrefs, router push calls, etc.). These are
 *      unstable social identifiers and must not appear in rendered URLs.
 *
 *  16. **instances-no-axios-or-fetch** (Epic 5.7 G4) — No file under
 *      `features/instances/` (excluding `services/`) may import `axios`
 *      or call `fetch(`. All traffic must flow through the service layer.
 *
 *  17. **instances-no-deprecated-routes** (Epic 5.7 G4) — No file under
 *      `features/instances/` may call any route listed in `DEPRECATED_ROUTES`.
 *
 *  18. **instances-no-direct-socket** (Epic 5.7 G4) — No file under
 *      `features/instances/` (excluding `useInstanceSocket.ts`) may register
 *      Socket.IO event listeners directly. All socket interactions must
 *      flow through `useInstanceSocket`.
 *
 *  20. **gameplay-no-axios-or-fetch** (Epic 5.8 H4) — No file under
 *      `features/instances/play/` (excluding `services/`) may import `axios`
 *      or call `fetch(`. All traffic must flow through the service layer.
 *
 *  21. **gameplay-no-direct-socket** (Epic 5.8 H4) — No file under
 *      `features/instances/play/` (excluding
 *      `hooks/useInstanceGameSocket.ts`) may register Socket.IO event
 *      listeners directly. All socket interactions must flow through
 *      `useInstanceGameSocket`.
 *
 *  22. **gameplay-no-author-correctness-fields** (Epic 5.8 H4) — No file
 *      under `features/instances/play/` may import author-only correctness
 *      field names (`isCorrect`, `correctOptionId`, `explanation`, `solution`,
 *      `weight`, `correctness`) from the gameplay type barrel. The exception
 *      is `AnswerResultDto.isCorrect` which is gated by `revealed: true` in
 *      `useInstanceLifecycle`.
 *
 *  23. **gameplay-hooks-have-tests** (Epic 5.8 H4) — Every gameplay hook
 *      exported from `hooks/index.ts` must have at least one test file
 *      consumer under `hooks/__tests__/`.
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
// ─── DEPRECATED_ROUTES (retired Phase 11 / P2-119) ─────────────────────
//
// As of TKT-Phase-11 the singular `/social/friend-request` route is
// no longer referenced anywhere in `src/features/social/**` (Phase 6
// rolled forward to the plural `/social/friend-requests` everywhere).
// The retired check is therefore a no-op kept here so older CI
// invocations can still parse the script. Update this comment and
// remove the no-op array below once the lint invariant is removed
// from CI.
const DEPRECATED_ROUTES_PATH = path.resolve(
  CWD,
  "src/lib/api/deprecated-routes.ts",
);
const DEPRECATED_ROUTES_RETIRED = true;
const DEPRECATED_ROUTES = [];

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
  rankings-achievements-no-axios-or-fetch  No axios/fetch under features/{rankings,achievements}/ (excl. services/).
  rankings-achievements-no-analytics-widgets  No getMyBadgeAnalytics in components/pages under features/{rankings,achievements}/.
  ranking-types-have-consumers    Every export from ranking.types.ts has a consumer under features/rankings/.
  achievement-types-have-consumers  Every export from achievement.types.ts has a consumer under features/achievements/.
  useEventuallyConsistentQuery-has-tests  useEventuallyConsistentQuery.spec.tsx exists.
  search-no-axios-or-fetch       No axios/fetch in non-service files under features/search/.
  search-no-social-write-dto     No FriendRequestDto/FollowDto imports under features/search/.
  search-no-unstable-social-ids  No followId/friendshipId references in features/search/.
  instances-no-axios-or-fetch    No axios/fetch in non-service files under features/instances/.
  instances-no-deprecated-routes No DEPRECATED_ROUTES calls from features/instances/.
  instances-no-direct-socket     No direct Socket.IO listener outside useInstanceSocket.ts under features/instances/.
  instance-types-have-consumers  Every export from instance.types.ts has a test consumer.
  gameplay-no-axios-or-fetch     No axios/fetch in non-service files under features/instances/play/.
  gameplay-no-direct-socket      No direct Socket.IO listener outside useInstanceGameSocket.ts under features/instances/play/.
  gameplay-no-author-correctness-fields  No author-only correctness fields imported into features/instances/play/.
  gameplay-hooks-have-tests      Every gameplay hook has at least one test file.

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

// ─── Load DEPRECATED_ROUTES (retired Phase 11 / P2-119) ───────────────
//
// The phase-11 cleanup retired the singular `/social/friend-request`
// route list (`src/lib/api/deprecated-routes.ts`). The script keeps a
// graceful no-op so older CI invocations that still call
// `phase5:lint-invariants:ci` continue to pass; the runtime check is
// always empty.
let deprecatedRoutes = [];

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
    if (ALLOWED_HOOK_FILES.has(path.resolve(file))) continue;

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

// ─── Check: rankings/achievements have no axios or fetch (Epic 5.5 G3) ────

/**
 * Walk all non-service files under `features/rankings/` and
 * `features/achievements/` (excluding `services/` and `__tests__/`)
 * and assert no file imports axios or calls fetch directly. The
 * ranking + achievement features must route all HTTP traffic
 * through the service wrappers under `services/`.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkRankingsAchievementsNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDirs = ["rankings", "achievements"];

  for (const feature of featureDirs) {
    const featureDir = path.resolve(FEATURES_DIR, feature);
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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
  }

  return violations;
}

// ─── Check: rankings/achievements have no analytics widgets (Epic 5.5 G3) ─

/**
 * Walk all `components/` files and the top-level `*.tsx` entries under
 * `features/rankings/` and `features/achievements/`, and assert no
 * file imports zero-returning analytics wrappers. The flagged functions
 * are known to return zeros and must never be rendered in the
 * Story 5.5 surfaces.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkRankingsAchievementsNoAnalyticsWidgets() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const FORBIDDEN_WIDGETS = ["getMyBadgeAnalytics"];

  const featureDirs = ["rankings", "achievements"];

  for (const feature of featureDirs) {
    const featureDir = path.resolve(FEATURES_DIR, feature);
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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

        for (const widget of FORBIDDEN_WIDGETS) {
          // A violation is any reference to the widget name in a non-service,
          // non-test file under ranking/achievement features.
          if (new RegExp(`\\b${widget}\\b`).test(raw)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              pattern: widget,
            });
          }
        }
      }
    }
  }

  return violations;
}

// ─── Check: ranking + achievement types have consumers (Epic 5.5 G3) ──────

/**
 * Walk `rankings/types/ranking.types.ts` and ensure every export has
 * a consumer under `features/rankings/`.
 *
 * @returns {Promise<Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>>}
 */
async function checkRankingTypesHaveConsumers() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>> */
  const orphanTypes = [];
  const typesFile = path.resolve(
    FEATURES_DIR,
    "rankings",
    "types",
    "ranking.types.ts",
  );

  try {
    const exports = extractTypeExports(typesFile);
    for (const type of exports) {
      const consumers = await findTypeConsumersInDir(
        type,
        typesFile,
        path.resolve(FEATURES_DIR, "rankings"),
        () => true,
      );
      if (consumers.length === 0) {
        orphanTypes.push({
          file: path.relative(CWD, typesFile),
          type,
          consumers: [],
        });
      }
    }
  } catch {
    // File doesn't exist yet — skip silently.
  }

  return orphanTypes;
}

/**
 * Walk `achievements/types/achievement.types.ts` and ensure every
 * export has a consumer under `features/achievements/`.
 *
 * @returns {Promise<Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>>}
 */
async function checkAchievementTypesHaveConsumers() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>> */
  const orphanTypes = [];
  const typesFile = path.resolve(
    FEATURES_DIR,
    "achievements",
    "types",
    "achievement.types.ts",
  );

  try {
    const exports = extractTypeExports(typesFile);
    for (const type of exports) {
      const consumers = await findTypeConsumersInDir(
        type,
        typesFile,
        path.resolve(FEATURES_DIR, "achievements"),
        () => true,
      );
      if (consumers.length === 0) {
        orphanTypes.push({
          file: path.relative(CWD, typesFile),
          type,
          consumers: [],
        });
      }
    }
  } catch {
    // File doesn't exist yet — skip silently.
  }

  return orphanTypes;
}

// ─── Check: useEventuallyConsistentQuery has tests (Epic 5.5 G3) ──────────

/**
 * Assert that the shared `useEventuallyConsistentQuery` primitive has a
 * unit test file. The check is binary — present or absent — so it does
 * not parse the spec, just looks for the file.
 *
 * @returns {Promise<{ exists: boolean; path: string }>}
 */
async function checkEventuallyConsistentQueryHasTests() {
  const testFile = path.resolve(
    FEATURES_DIR,
    "rankings",
    "hooks",
    "__tests__",
    "useEventuallyConsistentQuery.spec.tsx",
  );
  let exists = false;
  try {
    readFileSync(testFile, "utf-8");
    exists = true;
  } catch {
    exists = false;
  }
  return { exists, path: testFile };
}

// ─── Check: search has no axios or fetch (Epic 5.6 G3) ─────────────────

/**
 * Walk all non-service files under `features/search/` and assert no file
 * imports axios or calls fetch directly. The search feature must route all
 * HTTP traffic through the service wrappers under `services/`.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkSearchNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "search");

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: search has no social write DTO imports (Epic 5.6 G3) ──────

/**
 * Walk all files under `features/search/` (excluding services/) and assert
 * no file imports social write DTOs. Only read-only DTOs are permitted.
 * The forbidden DTOs are FriendRequestDto and FollowDto.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkSearchNoSocialWriteDtoImports() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "search");

  const FORBIDDEN_DTOS = [
    "FriendRequestDto",
    "FollowDto",
  ];

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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

        for (const dto of FORBIDDEN_DTOS) {
          // Match import of the DTO from any path
          const re = new RegExp(`\\b${dto}\\b`);
          if (re.test(raw)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              pattern: dto,
            });
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: search has no unstable social IDs in hrefs (Epic 5.6 G3) ───

/**
 * Walk all non-test files under `features/search/` and assert no file
 * references followId or friendshipId in string literals (hrefs, router
 * push calls, etc.). These are unstable social identifiers and must not
 * appear in any rendered navigation.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkSearchNoUnstableSocialIds() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "search");

  const FORBIDDEN_PATTERNS = [
    { pattern: "followId", re: /followId/ },
    { pattern: "friendshipId", re: /friendshipId/ },
  ];

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes("__tests__"),
    );

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

        for (const { pattern, re } of FORBIDDEN_PATTERNS) {
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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: instances feature has no axios or fetch (Epic 5.7 G4) ────────

/**
 * Walk all non-service files under `features/instances/` and assert no
 * file imports axios or calls fetch directly. The instance feature must
 * route all HTTP traffic through the service wrappers under `services/`.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkInstancesNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "instances");

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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

        if (raw.includes('from "axios"') || raw.includes("from 'axios'")) {
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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: instances feature has no deprecated route calls (Epic 5.7 G4) ─

/**
 * Walk all files under `features/instances/` and assert no file calls a
 * route listed in `DEPRECATED_ROUTES`. The instance feature must always
 * use the live SDK routes.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; route: string }>>}
 */
async function checkInstancesNoDeprecatedRoutes() {
  const featureDir = path.resolve(FEATURES_DIR, "instances");
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !f.includes("__tests__"),
    );

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

        for (const route of deprecatedRoutes) {
          if (raw.includes(route)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              route,
            });
            break;
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: instances feature has no direct Socket.IO listeners (Epic 5.7 G4)

/**
 * Walk all files under `features/instances/` (excluding
 * `hooks/useInstanceSocket.ts`) and assert no file calls Socket.IO
 * event listener APIs directly. The only allowed file is the dedicated
 * socket hook; every other file must dispatch through it.
 *
 * Forbidden patterns:
 *   - `socket.on(`, `socket.off(`, `socket.emit(`
 *   - `io(`
 *   - references to `socket.io-client`
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkInstancesNoDirectSocket() {
  const featureDir = path.resolve(FEATURES_DIR, "instances");
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const ALLOWED_HOOK_FILES = new Set([
    path.resolve(featureDir, "hooks/useInstanceSocket.ts"),
  ]);

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes("__tests__"),
    );

    for (const file of files) {
      if (ALLOWED_HOOK_FILES.has(path.resolve(file))) continue;

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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: instance types have consumers (Epic 5.7 G4) ──────────────────

/**
 * Walk `instances/types/instance.types.ts` and assert every export has
 * at least one consumer under `features/instances/__tests__/`. This
 * guards against orphan types added during the implementation.
 *
 * @returns {Promise<Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>>}
 */
async function checkInstanceTypesHaveConsumers() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>> */
  const orphanTypes = [];
  const typesFile = path.resolve(
    FEATURES_DIR,
    "instances",
    "types",
    "instance.types.ts",
  );

  try {
    const exports = extractTypeExports(typesFile);
    for (const type of exports) {
      const consumers = await findTypeConsumersInDir(
        type,
        typesFile,
        path.resolve(FEATURES_DIR, "instances"),
        (f) => f.includes("__tests__"),
      );
      if (consumers.length === 0) {
        orphanTypes.push({
          file: path.relative(CWD, typesFile),
          type,
          consumers: [],
        });
      }
    }
  } catch {
    // File doesn't exist yet — skip silently.
  }

  return orphanTypes;
}

// ─── Check: gameplay feature has no axios or fetch (Epic 5.8 H4) ───────

/**
 * Walk all non-service files under `features/instances/play/` and assert no
 * file imports axios or calls fetch directly. The gameplay feature must
 * route all HTTP traffic through the service wrappers.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkGameplayNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "instances", "play");

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__"),
    );

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

        if (raw.includes('from "axios"') || raw.includes("from 'axios'")) {
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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: gameplay feature has no direct Socket.IO listeners (Epic 5.8 H4) ──

/**
 * Walk all files under `features/instances/play/` (excluding
 * `hooks/useInstanceGameSocket.ts`) and assert no file calls Socket.IO
 * event listener APIs directly. The only allowed file is the dedicated
 * gameplay socket hook; every other file must dispatch through it.
 *
 * Forbidden patterns:
 *   - `socket.on(`, `socket.off(`, `socket.emit(`
 *   - `io(`
 *   - references to `socket.io-client`
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkGameplayNoDirectSocket() {
  const featureDir = path.resolve(FEATURES_DIR, "instances", "play");
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const ALLOWED_HOOK_FILES = new Set([
    path.resolve(featureDir, "hooks/useInstanceGameSocket.ts"),
  ]);

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes("__tests__"),
    );

    for (const file of files) {
      if (ALLOWED_HOOK_FILES.has(path.resolve(file))) continue;

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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: gameplay has no author-only correctness fields (Epic 5.8 H4) ──

/**
 * Walk all non-test files under `features/instances/play/` and assert no
 * file imports author-only correctness field names from any module. These
 * fields must never appear in player-facing code:
 *
 *   - `isCorrect` (except via `AnswerResultDto.revealed === true` gate)
 *   - `correctOptionId`
 *   - `explanation`
 *   - `solution`
 *   - `weight`
 *   - `correctness`
 *
 * The exception is `AnswerResultDto.isCorrect` accessed after the
 * `revealed: true` check — this is enforced by `useInstanceLifecycle`
 * (TKT-5.8.B6) and the lint invariant.
 *
 * @returns {Promise<Array<{ file: string; line: number; text: string; pattern: string }>>}
 */
async function checkGameplayNoAuthorCorrectnessFields() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];
  const featureDir = path.resolve(FEATURES_DIR, "instances", "play");

  // Fields that must not appear as named imports (i.e. from any module path).
  // The check is a word-boundary match on the import statement itself.
  // Comment lines are skipped so JSDoc exclusion lists in type files don't
  // cause false violations.
  const FORBIDDEN_FIELDS = [
    { pattern: "isCorrect", re: /\bisCorrect\b/ },
    { pattern: "correctOptionId", re: /\bcorrectOptionId\b/ },
    { pattern: "explanation", re: /\bexplanation\b/ },
    { pattern: "solution", re: /\bsolution\b/ },
    { pattern: "weight", re: /\bweight\b/ },
    { pattern: "correctness", re: /\bcorrectness\b/ },
  ];

  try {
    const files = await walkFiles(
      featureDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".mts") || f.endsWith(".cts")) &&
        !f.includes("__tests__"),
    );

    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i];
        const trimmed = raw.trimStart();

        // Skip comment lines so JSDoc exclusion lists in type files don't
        // produce false violations.
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("<!--")
        )
          continue;

        // Only check import statements.
        if (!raw.includes("from ")) continue;

        for (const { pattern, re } of FORBIDDEN_FIELDS) {
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
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return violations;
}

// ─── Check: gameplay hooks have tests (Epic 5.8 H4) ──────────────────────

/**
 * Walk `features/instances/play/hooks/` and assert every exported hook
 * has at least one test file consumer under `hooks/__tests__/`.
 *
 * This guards that every gameplay hook is covered by unit tests.
 *
 * @returns {Promise<Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>>}
 */
async function checkGameplayHooksHaveTests() {
  /** @type {Array<{ file: string; type: string; consumers: Array<{ file: string; line: number }> }>} */
  const orphanHooks = [];
  const hooksDir = path.resolve(FEATURES_DIR, "instances", "play", "hooks");
  const testsDir = path.resolve(FEATURES_DIR, "instances", "play", "hooks", "__tests__");

  try {
    const hookFiles = await walkFiles(
      hooksDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) &&
        !f.includes("__tests__") &&
        !f.endsWith("index.ts"),
    );

    for (const hookFile of hookFiles) {
      // Extract the hook name from the filename (e.g. useFooBar.ts → useFooBar)
      const baseName = path.basename(hookFile, path.extname(hookFile));

      // Check if a corresponding test file exists.
      const testFile = path.resolve(testsDir, `${baseName}.spec.tsx`);
      let testExists = false;
      try {
        readFileSync(testFile, "utf-8");
        testExists = true;
      } catch {
        testExists = false;
      }

      if (!testExists) {
        orphanHooks.push({
          file: path.relative(CWD, hookFile),
          type: baseName,
          consumers: [],
        });
      }
    }
  } catch {
    // Directory doesn't exist yet — skip silently.
  }

  return orphanHooks;
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

// ─── Report helpers: Epic 5.5 G3 ─────────────────────────────────────────

function reportRankingsAchievementsNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} rankings-achievements-no-axios-or-fetch — no axios/fetch in non-service files under features/{rankings,achievements}/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} rankings-achievements-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportRankingsAchievementsNoAnalyticsWidgets(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} rankings-achievements-no-analytics-widgets — no zero-returning analytics wrappers referenced from components or pages\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} rankings-achievements-no-analytics-widgets — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden widget:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportRankingTypesHaveConsumers(orphanTypes) {
  if (orphanTypes.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} ranking-types-have-consumers — all exports from ranking.types.ts have at least one consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} ranking-types-have-consumers — ${BOLD(String(orphanTypes.length))} orphaned export(s) with no consumer\n\n`,
  );

  for (const t of orphanTypes) {
    process.stdout.write(
      `  ${RED("no consumer for:")} ${BOLD(t.type)}  ${DIM(t.file)}\n`,
    );
  }

  return false;
}

function reportAchievementTypesHaveConsumers(orphanTypes) {
  if (orphanTypes.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} achievement-types-have-consumers — all exports from achievement.types.ts have at least one consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} achievement-types-have-consumers — ${BOLD(String(orphanTypes.length))} orphaned export(s) with no consumer\n\n`,
  );

  for (const t of orphanTypes) {
    process.stdout.write(
      `  ${RED("no consumer for:")} ${BOLD(t.type)}  ${DIM(t.file)}\n`,
    );
  }

  return false;
}

function reportEventuallyConsistentQueryHasTests(result) {
  if (result.exists) {
    process.stdout.write(
      `${GREEN("✓")} useEventuallyConsistentQuery-has-tests — ${DIM(path.relative(CWD, result.path))}\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} useEventuallyConsistentQuery-has-tests — ${DIM(path.relative(CWD, result.path))} is missing\n`,
  );
  return false;
}

// ─── Report helpers: Epic 5.6 G3 ─────────────────────────────────────────

function reportSearchNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} search-no-axios-or-fetch — no axios/fetch in non-service files under features/search/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} search-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSearchNoSocialWriteDtoImports(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} search-no-social-write-dto — no FriendRequestDto/FollowDto imports under features/search/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} search-no-social-write-dto — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden DTO:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSearchNoUnstableSocialIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} search-no-unstable-social-ids — no followId/friendshipId references in features/search/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} search-no-unstable-social-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Report helpers: Epic 5.7 G4 ─────────────────────────────────────────

function reportInstancesNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} instances-no-axios-or-fetch — no axios/fetch in non-service files under features/instances/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} instances-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportInstancesNoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} instances-no-deprecated-routes — no DEPRECATED_ROUTES calls from features/instances/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} instances-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportInstancesNoDirectSocket(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} instances-no-direct-socket — no direct Socket.IO listener registration under features/instances/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} instances-no-direct-socket — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportInstanceTypesHaveConsumers(orphanTypes) {
  if (orphanTypes.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} instance-types-have-consumers — all exports from instance.types.ts have at least one test consumer\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} instance-types-have-consumers — ${BOLD(String(orphanTypes.length))} orphaned export(s) with no test consumer\n\n`,
  );

  for (const t of orphanTypes) {
    process.stdout.write(
      `  ${RED("no test consumer for:")} ${BOLD(t.type)}  ${DIM(t.file)}\n`,
    );
  }

  return false;
}

// ─── Report helpers: Epic 5.8 H4 ───────────────────────────────────────

function reportGameplayNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} gameplay-no-axios-or-fetch — no axios/fetch in non-service files under features/instances/play/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} gameplay-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportGameplayNoDirectSocket(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} gameplay-no-direct-socket — no direct Socket.IO listener registration under features/instances/play/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} gameplay-no-direct-socket — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportGameplayNoAuthorCorrectnessFields(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} gameplay-no-author-correctness-fields — no author-only correctness fields imported into features/instances/play/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} gameplay-no-author-correctness-fields — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden field:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportGameplayHooksHaveTests(orphanHooks) {
  if (orphanHooks.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} gameplay-hooks-have-tests — all gameplay hooks have at least one test file\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} gameplay-hooks-have-tests — ${BOLD(String(orphanHooks.length))} hook(s) missing test files\n\n`,
  );

  for (const h of orphanHooks) {
    process.stdout.write(
      `  ${RED("no test for:")} ${BOLD(h.type)}  ${DIM(h.file)}\n`,
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

  // Check 8: rankings-achievements-no-axios-or-fetch (Epic 5.5 G3)
  // No file under features/{rankings,achievements}/ outside services/ may
  // import axios or call fetch directly. The features must route all
  // HTTP traffic through their service wrappers.
  const rankingsAchievementsAxios = await checkRankingsAchievementsNoAxiosOrFetch();
  if (!reportRankingsAchievementsNoAxiosOrFetch(rankingsAchievementsAxios)) {
    ok = false;
  }

  // Check 9: rankings-achievements-no-analytics-widgets (Epic 5.5 G3)
  // No component / page entry under features/{rankings,achievements}/ may
  // import zero-returning analytics wrappers like getMyBadgeAnalytics.
  const rankingsAchievementsAnalytics =
    await checkRankingsAchievementsNoAnalyticsWidgets();
  if (!reportRankingsAchievementsNoAnalyticsWidgets(rankingsAchievementsAnalytics)) {
    ok = false;
  }

  // Check 10: ranking-types-have-consumers (Epic 5.5 G3)
  const orphanRankingTypes = await checkRankingTypesHaveConsumers();
  if (!reportRankingTypesHaveConsumers(orphanRankingTypes)) {
    ok = false;
  }

  // Check 11: achievement-types-have-consumers (Epic 5.5 G3)
  const orphanAchievementTypes = await checkAchievementTypesHaveConsumers();
  if (!reportAchievementTypesHaveConsumers(orphanAchievementTypes)) {
    ok = false;
  }

  // Check 12: useEventuallyConsistentQuery-has-tests (Epic 5.5 G3)
  const eventConsistentTests = await checkEventuallyConsistentQueryHasTests();
  if (!reportEventuallyConsistentQueryHasTests(eventConsistentTests)) {
    ok = false;
  }

  // Check 13: search-no-axios-or-fetch (Epic 5.6 G3)
  const searchAxiosViolations = await checkSearchNoAxiosOrFetch();
  if (!reportSearchNoAxiosOrFetch(searchAxiosViolations)) {
    ok = false;
  }

  // Check 14: search-no-social-write-dto (Epic 5.6 G3)
  const searchWriteDtoViolations = await checkSearchNoSocialWriteDtoImports();
  if (!reportSearchNoSocialWriteDtoImports(searchWriteDtoViolations)) {
    ok = false;
  }

  // Check 15: search-no-unstable-social-ids (Epic 5.6 G3)
  const searchSocialIdViolations = await checkSearchNoUnstableSocialIds();
  if (!reportSearchNoUnstableSocialIds(searchSocialIdViolations)) {
    ok = false;
  }

  // Check 16: instances-no-axios-or-fetch (Epic 5.7 G4)
  // No file under features/instances/ (excluding services/) may import
  // axios or call fetch. The feature must route all HTTP traffic
  // through the service wrappers.
  const instancesAxiosViolations = await checkInstancesNoAxiosOrFetch();
  if (!reportInstancesNoAxiosOrFetch(instancesAxiosViolations)) {
    ok = false;
  }

  // Check 17: instances-no-deprecated-routes (Epic 5.7 G4)
  // No file under features/instances/ may call a route listed in
  // DEPRECATED_ROUTES. The feature must always use the live SDK routes.
  const instancesDeprecatedViolations = await checkInstancesNoDeprecatedRoutes();
  if (!reportInstancesNoDeprecatedRoutes(instancesDeprecatedViolations)) {
    ok = false;
  }

  // Check 18: instances-no-direct-socket (Epic 5.7 G4)
  // No file under features/instances/ (other than
  // hooks/useInstanceSocket.ts) may register Socket.IO listeners
  // directly. All socket interactions must flow through the hook.
  const instancesSocketViolations = await checkInstancesNoDirectSocket();
  if (!reportInstancesNoDirectSocket(instancesSocketViolations)) {
    ok = false;
  }

  // Check 19: instance-types-have-consumers (Epic 5.7 G4)
  // Every export from instance.types.ts must have at least one test
  // consumer under features/instances/__tests__/.
  const orphanInstanceTypes = await checkInstanceTypesHaveConsumers();
  if (!reportInstanceTypesHaveConsumers(orphanInstanceTypes)) {
    ok = false;
  }

  // Check 20: gameplay-no-axios-or-fetch (Epic 5.8 H4)
  // No file under features/instances/play/ (excluding services/) may import
  // axios or call fetch. The gameplay feature must route all HTTP traffic
  // through the service wrappers.
  const gameplayAxiosViolations = await checkGameplayNoAxiosOrFetch();
  if (!reportGameplayNoAxiosOrFetch(gameplayAxiosViolations)) {
    ok = false;
  }

  // Check 21: gameplay-no-direct-socket (Epic 5.8 H4)
  // No file under features/instances/play/ (other than
  // hooks/useInstanceGameSocket.ts) may register Socket.IO listeners
  // directly. All socket interactions must flow through the hook.
  const gameplaySocketViolations = await checkGameplayNoDirectSocket();
  if (!reportGameplayNoDirectSocket(gameplaySocketViolations)) {
    ok = false;
  }

  // Check 22: gameplay-no-author-correctness-fields (Epic 5.8 H4)
  // No file under features/instances/play/ may import author-only
  // correctness fields. These must never appear in player-facing code.
  const gameplayAuthorViolations = await checkGameplayNoAuthorCorrectnessFields();
  if (!reportGameplayNoAuthorCorrectnessFields(gameplayAuthorViolations)) {
    ok = false;
  }

  // Check 23: gameplay-hooks-have-tests (Epic 5.8 H4)
  // Every gameplay hook exported from hooks/index.ts must have at least
  // one test file consumer under hooks/__tests__/.
  const orphanGameplayHooks = await checkGameplayHooksHaveTests();
  if (!reportGameplayHooksHaveTests(orphanGameplayHooks)) {
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
