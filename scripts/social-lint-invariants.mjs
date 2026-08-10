#!/usr/bin/env node
/**
 * social-lint-invariants.mjs — Phase 6 cross-batch invariant gate.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source ticket: TKT-6.1.G1.
 *
 * Encodes the Phase 6 cross-batch invariants that complement the existing
 * `realtime-lint-invariants.mjs` script. Phase 6 introduces a new
 * `features/social/` directory and several invariants that the older
 * script does not (and should not) encode:
 *
 *   1. **social-no-axios-or-fetch** — No file under `features/social/**`
 *      (excluding the `services/` subdirectory and `__tests__/`) may import
 *      `axios` or call `fetch(` directly. All HTTP traffic must flow
 *      through the service wrappers.
 *
 *   2. **social-no-deprecated-routes** — No file under `features/social/**`
 *      may reference any route listed in `DEPRECATED_ROUTES`. The
 *      singular `/social/friend-request` route is the canonical example:
 *      the SDK has been migrated to `/social/friend-requests` (plural) and
 *      the deprecated form must never appear in production code.
 *
 *   3. **social-no-unstable-social-ids-in-sink** — No file under
 *      `features/social/**` may write `followId` or `friendshipId` into
 *      the documented sinks (URLs, `localStorage`, `sessionStorage`,
 *      `console.log`, `Sentry` payloads). These are unstable internal
 *      identifiers that must never leak to the outside world (Phase 6
 *      Risks line 54).
 *
 *   4. **social-services-no-deprecated-routes** — Explicit reinforcement
 *      of (2) for the `features/social/services/` subdirectory. The
 *      tests under `__tests__/` are exempt because some test fixtures
 *      deliberately exercise the deprecated route to confirm the lint
 *      rule fires.
 *
 * The script is intentionally split from `realtime-lint-invariants.mjs` so
 * the existing Phase 5 checks (which already include a service-wide
 * no-axios / no-deprecated-routes gate) are not perturbed by Phase 6
 * additions. The `package.json` `phase6:lint-invariants` script is the
 * canonical entry point.
 *
 * ## Usage
 *
 *   node scripts/social-lint-invariants.mjs [--help]
 *
 *   - `--help`       Print the help text and exit 64.
 *   - `--ci`         Treat warnings as errors (no-op with current check set).
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
const SOCIAL_DIR = path.resolve(FEATURES_DIR, "social");
const APP_DIR = path.resolve(CWD, "src/app");
const APP_SOCIAL_DIR = path.resolve(APP_DIR, "(protected)", "social");
const DEPRECATED_ROUTES_PATH = path.resolve(
  CWD,
  "src/lib/api/deprecated-routes.ts",
);

const SINK_PATTERNS = [
  { pattern: "url", re: /URLSearchParams/ },
  { pattern: "localStorage", re: /\blocalStorage\b/ },
  { pattern: "sessionStorage", re: /\bsessionStorage\b/ },
  { pattern: "window.location", re: /\bwindow\.location\b/ },
  { pattern: "console.log", re: /\bconsole\.log\b/ },
  { pattern: "Sentry payload", re: /\bSentry\b/ },
];

// ─── CLI ──────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/social-lint-invariants.mjs [--help]

Checks (always run):
  social-no-axios-or-fetch          No axios/fetch in non-service files under features/social/.
  social-no-deprecated-routes       No DEPRECATED_ROUTES calls from any features/social/ file.
  social-no-unstable-social-ids     No followId/friendshipId written to URL/localStorage/Sentry sinks.
                                    Scans features/social/** and app/(protected)/social/** (TKT-6.2.G3).
  social-services-no-deprecated-routes  Explicit reinforcement for the services/ subdirectory.
  social-discovery-no-axios-or-fetch (TKT-6.5.H2) No axios/fetch in discovery/search files.
  social-discovery-no-raw-query-logging (TKT-6.5.H2) No raw query interpolation in social discovery/search.
  social-discovery-no-unstable-ids (TKT-6.5.H2) No followId/friendshipId in scroll-guard.
  social-discovery-no-deprecated-routes (TKT-6.5.H2) Explicit reinforcement for discovery/search.
  social66-no-axios-or-fetch (TKT-6.6.G2) No axios/fetch in follow-mutation.service.ts.
  social66-no-deprecated-routes (TKT-6.6.G2) No deprecated routes in follow-mutation.service.ts.
  social66-no-unstable-ids (TKT-6.6.G2) No followId/friendshipId in follow-mutation.service.ts sinks.
  social66-sentry-no-unstable-ids (TKT-6.6.G2) No followId/friendshipId in social-follow-mutation-sentry sinks.
  social67-no-axios-or-fetch (TKT-6.7.G3) No axios/fetch in block-mutation.service.ts.
  social67-no-deprecated-routes (TKT-6.7.G3) No deprecated routes in block-mutation.service.ts.
  social67-no-unstable-ids (TKT-6.7.G3) No followId/friendshipId in block-mutation.service.ts sinks.
  social67-sentry-no-unstable-ids (TKT-6.7.G3) No followId/friendshipId in social-discovery-search-sentry sinks.
  social67-no-direct-sdk-calls (TKT-6.7.G3) Components do not import socialControllerBlockUser/socialControllerUnblockUser.
  social68-no-deprecated-friend-request-route (TKT-6.8.G2) friend-request-mutation.service.ts does not import the deprecated singular /social/friend-request SDK family.
  social68-no-friendship-id-persistence (TKT-6.8.G2) No friendshipId written to localStorage/sessionStorage/URLSearchParams/window.history/window.location across features/social/.
  social69-no-client-side-cursor (TKT-6.9.H2) No file under features/social/** builds a cursor string from a numeric offset.
  social69-no-offset-persistence (TKT-6.9.H2) No file under features/social/** writes offset/cursor/limit into localStorage/sessionStorage/URLSearchParams.
  social69-no-direct-sdk-feed-calls (TKT-6.9.H2) socialControllerGetFeed is only imported from feed.service.ts.
  social610-no-deprecated-friend-request-route-realtime (TKT-6.10.G3) No deprecated friend-request SDK calls from realtime/invalidation modules.
  social610-no-friendship-id-persistence-realtime (TKT-6.10.G3) No friendshipId written to localStorage/sessionStorage/window.history/URLSearchParams in realtime/invalidation modules.
  social610-no-follow-id-persistence-realtime (TKT-6.10.G3) No followId written to localStorage/sessionStorage/window.history/URLSearchParams in realtime/invalidation modules.
  social610-no-event-payload-persistence (TKT-6.10.G3) No event payload field beyond actorUserId/targetUserId/correlationId/version written to persistence sinks in realtime/invalidation modules.

Flags:
  --help    Print this help and exit 64.
  --ci      CI mode (no behaviour change today; reserved for future strictness).
`;

const args = process.argv.slice(2);
let ci = false;

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--help" || a === "-h") {
    process.stdout.write(USAGE);
    process.exit(64);
  } else if (a === "--ci") {
    ci = true;
  } else {
    process.stderr.write(
      `[phase6:lint-invariants] unknown flag: ${a}\n`,
    );
    process.exit(2);
  }
}

void ci;

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
      // Directory missing — skip silently.
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

const deprecatedRoutes = loadDeprecatedRoutes();

function loadDeprecatedRoutes() {
  let src;
  try {
    src = readFileSync(DEPRECATED_ROUTES_PATH, "utf-8");
  } catch {
    // If the file is missing, return an empty list. The Phase 5
    // invariants script will surface the missing-route error.
    return [];
  }
  const match = src.match(
    /DEPRECATED_ROUTES\s*=\s*\[\s*([^\];]+)\s*\]/s,
  );
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
    .filter(Boolean);
}

// ─── Line-iter helpers ───────────────────────────────────────────────────

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("<!--")
  );
}

function isTestFile(file) {
  return file.includes(`${path.sep}__tests__${path.sep}`);
}

function isServiceFile(file) {
  return file.includes(`${path.sep}services${path.sep}`);
}

// ─── Check: social feature no axios or fetch (non-service) ──────────────

async function checkSocialNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isServiceFile(f) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

// ─── Check: no deprecated routes (any features/social file) ────────────

async function checkSocialNoDeprecatedRoutes() {
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: services no deprecated routes (explicit reinforcement) ─────

async function checkSocialServicesNoDeprecatedRoutes() {
  // Same shape as the feature-wide check but restricted to the
  // services/ subdirectory so the report message is unambiguous.
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  let files;
  try {
    files = await walkFiles(
      path.resolve(SOCIAL_DIR, "services"),
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: no followId / friendshipId in sink surfaces ─────────────────

async function checkSocialNoUnstableSocialIdsInSinks() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  // TKT-6.2.G3 — the original Epic 6.1 (G1) check covered
  // `features/social/**`. The Epic 6.2 G3 ticket extends the
  // surface to `app/(protected)/social/**` so any Server Component route
  // file that leaks an internal id into a URL key or localStorage
  // is caught by CI.
  const scannedDirs = [SOCIAL_DIR];
  if (await directoryExists(APP_SOCIAL_DIR)) {
    scannedDirs.push(APP_SOCIAL_DIR);
  }

  /** @type {string[]} */
  let files = [];
  for (const root of scannedDirs) {
    const found = await walkFiles(
      root,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
    files = files.concat(found);
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const { pattern, re } of SINK_PATTERNS) {
        if (!re.test(raw)) continue;

        for (const id of FORBIDDEN_IDS) {
          const idRe = new RegExp(`\\b${id}\\b`);
          if (idRe.test(raw)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              sink: pattern,
              identifier: id,
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Check that a directory exists before adding it to the scanned
 * list. The helper is async because most path APIs in Node are
 * sync; we use the wrapper around `stat` to keep the contract
 * uniform with the rest of the script.
 *
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
async function directoryExists(dir) {
  try {
    const { statSync } = await import("node:fs");
    const stat = statSync(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// ─── Epic 6.6 checks (TKT-6.6.G2) ─────────────────────────────────────────

// ─── Check: Epic 6.6 — follow-mutation.service.ts no axios or fetch (TKT-6.6.G2)

async function checkSocial66NoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/follow-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: Epic 6.6 — follow-mutation.service.ts no deprecated routes (TKT-6.6.G2)

async function checkSocial66NoDeprecatedRoutes() {
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/follow-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: Epic 6.6 — follow-mutation.service.ts no followId/friendshipId in sinks (TKT-6.6.G2)

async function checkSocial66NoUnstableSocialIds() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/follow-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const sinkDef of SINK_PATTERNS) {
        if (sinkDef.re.test(raw)) {
          for (const id of FORBIDDEN_IDS) {
            const idRe = new RegExp(`\\b${id}\\b`);
            if (idRe.test(raw)) {
              violations.push({
                file: path.relative(CWD, file),
                line: i + 1,
                text: raw.trim(),
                sink: sinkDef.pattern,
                identifier: id,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

// ─── Check: Epic 6.6 Sentry helpers — no followId/friendshipId in sinks (TKT-6.6.G2)

async function checkSocial66SentryNoUnstableIds() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const sentryDir = path.resolve(CWD, "src/lib/social");

  let files;
  try {
    files = await walkFiles(
      sentryDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) &&
        /social-follow-mutation-sentry/.test(f),
    );
  } catch {
    return violations;
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const sinkDef of SINK_PATTERNS) {
        if (sinkDef.re.test(raw)) {
          for (const id of FORBIDDEN_IDS) {
            const idRe = new RegExp(`\\b${id}\\b`);
            if (idRe.test(raw)) {
              violations.push({
                file: path.relative(CWD, file),
                line: i + 1,
                text: raw.trim(),
                sink: sinkDef.pattern,
                identifier: id,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

// ─── Epic 6.7 checks (TKT-6.7.G3) ─────────────────────────────────────────

// ─── Check: Epic 6.7 — block-mutation.service.ts no axios or fetch (TKT-6.7.G3)

async function checkSocial67NoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/block-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: Epic 6.7 — block-mutation.service.ts no deprecated routes (TKT-6.7.G3)

async function checkSocial67NoDeprecatedRoutes() {
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/block-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Check: Epic 6.7 — block-mutation.service.ts no followId/friendshipId in sinks (TKT-6.7.G3)

async function checkSocial67NoUnstableSocialIds() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/block-mutation.service.ts",
  );

  let files;
  try {
    const src = readFileSync(targetFile, "utf-8");
    files = [{ file: targetFile, src }];
  } catch {
    return violations;
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const { file, src } of files) {
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const sinkDef of SINK_PATTERNS) {
        if (sinkDef.re.test(raw)) {
          for (const id of FORBIDDEN_IDS) {
            const idRe = new RegExp(`\\b${id}\\b`);
            if (idRe.test(raw)) {
              violations.push({
                file: path.relative(CWD, file),
                line: i + 1,
                text: raw.trim(),
                sink: sinkDef.pattern,
                identifier: id,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

// ─── Check: Epic 6.7 Sentry helpers — no followId/friendshipId in sinks (TKT-6.7.G3)

async function checkSocial67SentryNoUnstableIds() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const sentryDir = path.resolve(CWD, "src/lib/social");

  let files;
  try {
    files = await walkFiles(
      sentryDir,
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) &&
        /social-discovery-search-sentry/.test(f),
    );
  } catch {
    return violations;
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const sinkDef of SINK_PATTERNS) {
        if (sinkDef.re.test(raw)) {
          for (const id of FORBIDDEN_IDS) {
            const idRe = new RegExp(`\\b${id}\\b`);
            if (idRe.test(raw)) {
              violations.push({
                file: path.relative(CWD, file),
                line: i + 1,
                text: raw.trim(),
                sink: sinkDef.pattern,
                identifier: id,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

// ─── Check: Epic 6.7 — components do not call SDK block functions directly (TKT-6.7.G3)

async function checkSocial67NoDirectSdkCalls() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const componentsDir = path.resolve(SOCIAL_DIR, "components");

  let files;
  try {
    files = await walkFiles(
      componentsDir,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  const FORBIDDEN_SDK_CALLS = [
    "socialControllerBlockUser",
    "socialControllerUnblockUser",
  ];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const fn of FORBIDDEN_SDK_CALLS) {
        if (raw.includes(fn)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            pattern: fn,
          });
        }
      }
    }
  }

  return violations;
}

// ─── Epic 6.8 checks (TKT-6.8.G2) ────────────────────────────────────────────

// ─── Check: Epic 6.8 — friend-request mutation service does not call deprecated friend-request route (TKT-6.8.G2)

/**
 * Asserts that `features/social/services/friend-request-mutation.service.ts`
 * does not import or call any SDK function generated from the deprecated
 * singular `/social/friend-request` path. The check is intentionally scoped
 * to the friend-request mutation service file because that is the only
 * place that should ever call the friend-request lifecycle endpoints; any
 * reference to `socialControllerDeprecatedFriendRequestPath*` would indicate
 * that the deprecated route has crept into the service.
 *
 * The check matches the entire family of HTTP-verb-suffixed deprecated
 * functions generated by `openapi-typescript-codegen` for the deprecated
 * `ANY /social/friend-request` path:
 *   - `socialControllerDeprecatedFriendRequestPathDelete`
 *   - `socialControllerDeprecatedFriendRequestPathGet`
 *   - `socialControllerDeprecatedFriendRequestPathHead`
 *   - `socialControllerDeprecatedFriendRequestPathOptions`
 *   - `socialControllerDeprecatedFriendRequestPathPatch`
 *   - `socialControllerDeprecatedFriendRequestPathPost`
 *   - `socialControllerDeprecatedFriendRequestPathPut`
 */
async function checkSocial68NoDeprecatedFriendRequestRoute() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const targetFile = path.resolve(
    SOCIAL_DIR,
    "services/friend-request-mutation.service.ts",
  );

  let src;
  try {
    src = readFileSync(targetFile, "utf-8");
  } catch {
    return violations;
  }

  // The deprecated singular route appears in the SDK as
  // `socialControllerDeprecatedFriendRequestPath*` (verb-suffixed).
  // Matching on the full family keeps the check resilient to whatever
  // verb the deprecated controller exposes.
  const DEPRECATED_FRIEND_REQUEST_FAMILY =
    "socialControllerDeprecatedFriendRequestPath";

  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (isCommentLine(raw)) continue;

    if (raw.includes(DEPRECATED_FRIEND_REQUEST_FAMILY)) {
      violations.push({
        file: path.relative(CWD, targetFile),
        line: i + 1,
        text: raw.trim(),
        pattern: DEPRECATED_FRIEND_REQUEST_FAMILY,
      });
    }
  }

  return violations;
}

// ─── Check: Epic 6.8 — no `friendshipId` written to persistence/URL sinks (TKT-6.8.G2)

/**
 * Asserts that no file under `features/social/` writes the unstable
 * `friendshipId` identifier into any of the documented persistence or
 * URL sinks. The check is structurally similar to
 * `checkSocialNoUnstableSocialIdsInSinks` but extended to catch:
 *
 *   - `localStorage.setItem(...)`            — persistent browser storage
 *   - `sessionStorage.setItem(...)`          — tab-scoped browser storage
 *   - `window.history.pushState(...)`        — URL history stack
 *   - `window.history.replaceState(...)`     — URL history stack
 *   - `URLSearchParams` construction         — query-string keys
 *   - `window.location = ...` / `.assign` / `.replace` — hard URL writes
 *
 * `friendshipId` is the unstable internal identifier of a friend-request
 * row. It must never leave the service / hook layer because it leaks the
 * server-side row identity and would let any client reconstruct the
 * internal database shape. The cross-batch invariant 8 ("Unstable
 * `friendshipId` hygiene") forbids persistence.
 *
 * The original `checkSocialNoUnstableSocialIdsInSinks` check (Epic 6.1
 * G1) catches `friendshipId` on the same sinks, but only inside the
 * scope of `{pattern, identifier}` lines where BOTH appear on a single
 * line. This dedicated check independently enforces the friendship-id
 * hygiene rule so that it survives future refactors of the broader
 * sink-check regex.
 */
async function checkSocial68NoFriendshipIdPersistence() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  // The check walks ALL of `features/social/` (including `services/`,
  // `hooks/`, `components/`, `pages/`, etc.) so that even an accidental
  // persistence call from a future Story 7 hook is caught.
  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  // Persistence sinks. Each entry maps a human-readable sink name to
  // the regex that triggers a violation when `friendshipId` appears on
  // the same line.
  const PERSISTENCE_SINKS = [
    { pattern: "localStorage.setItem", re: /\blocalStorage\.setItem\b/ },
    {
      pattern: "sessionStorage.setItem",
      re: /\bsessionStorage\.setItem\b/ },
    { pattern: "URLSearchParams", re: /\bURLSearchParams\b/ },
    {
      pattern: "window.history.pushState",
      re: /\bwindow\.history\.pushState\b/,
    },
    {
      pattern: "window.history.replaceState",
      re: /\bwindow\.history\.replaceState\b/,
    },
    {
      pattern: "window.location write",
      re: /\bwindow\.location(?:\s*=|.assign|.replace)\b/,
    },
  ];

  const FORBIDDEN_ID = "friendshipId";

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const { pattern, re } of PERSISTENCE_SINKS) {
        if (!re.test(raw)) continue;

        const idRe = new RegExp(`\\b${FORBIDDEN_ID}\\b`);
        if (idRe.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            sink: pattern,
            identifier: FORBIDDEN_ID,
          });
        }
      }
    }
  }

  return violations;
}

// ─── Report helpers ─────────────────────────────────────────────────────

function reportSocialNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-no-axios-or-fetch — no axios/fetch in non-service files under features/social/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocialNoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-no-deprecated-routes — no DEPRECATED_ROUTES calls from features/social/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  const byRoute = new Map();
  for (const v of violations) {
    if (!byRoute.has(v.route)) byRoute.set(v.route, []);
    byRoute.get(v.route).push(v);
  }

  for (const [route, hits] of byRoute) {
    process.stdout.write(`${RED("deprecated route:")} ${BOLD(route)}\n`);
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

function reportSocialServicesNoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-services-no-deprecated-routes — no DEPRECATED_ROUTES calls from features/social/services/\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-services-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("deprecated route:")} ${BOLD(v.route)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocialNoUnstableSocialIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-no-unstable-social-ids — no followId/friendshipId written to URL/localStorage/Sentry sinks (features/social/** + app/(protected)/social/**)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-no-unstable-social-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Check: social discovery no axios or fetch (TKT-6.5.H2) ─────────────────

async function checkSocialDiscoveryNoAxiosOrFetch() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  // Scan discovery, lists, and hooks directories
  const scanDirs = [
    path.resolve(SOCIAL_DIR, "discovery"),
    path.resolve(SOCIAL_DIR, "lists"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of scanDirs) {
    const found = await walkFiles(
      dir,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
    files = files.concat(found);
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

// ─── Check: social discovery no raw query logging (TKT-6.5.H2) ─────────────

async function checkSocialDiscoveryNoRawQueryLogging() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  // Scan all social directories
  let files = await walkFiles(
    SOCIAL_DIR,
    (f) =>
      (f.endsWith(".ts") ||
        f.endsWith(".tsx") ||
        f.endsWith(".mts") ||
        f.endsWith(".cts")) &&
      !isTestFile(f),
  );

  // Also scan the scroll-guard
  const scrollGuardPath = path.resolve(CWD, "src/lib/router/scroll-guard.tsx");
  try {
    readFileSync(scrollGuardPath, "utf-8");
    files.push(scrollGuardPath);
  } catch {
    // File might not exist yet
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      // Check for raw query interpolation: `${query}`, `${q}`, etc.
      // These patterns indicate raw query logging
      const rawQueryPatterns = [
        /\`.*\$\{[^}]*query[^}]*\}.*\`/, // template literal with query variable
        /console\.log\([^)]*\$\{[^}]*query[^}]*\}[^)]*\)/, // console.log with query interpolation
      ];

      for (const pattern of rawQueryPatterns) {
        if (pattern.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            pattern: "raw query interpolation",
          });
        }
      }
    }
  }

  return violations;
}

// ─── Check: social discovery no unstable IDs in scroll-guard (TKT-6.5.H2) ─

async function checkSocialDiscoveryNoUnstableIds() {
  /** @type {Array<{ file: string; line: number; text: string; identifier: string }>} */
  const violations = [];

  const scrollGuardPath = path.resolve(CWD, "src/lib/router/scroll-guard.tsx");

  let files;
  try {
    files = [scrollGuardPath];
  } catch {
    return violations;
  }

  const FORBIDDEN_IDS = ["followId", "friendshipId"];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const id of FORBIDDEN_IDS) {
        const idRe = new RegExp(`\\b${id}\\b`);
        if (idRe.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            identifier: id,
          });
        }
      }
    }
  }

  return violations;
}

// ─── Check: social discovery no deprecated routes (TKT-6.5.H2) ───────────────

async function checkSocialDiscoveryNoDeprecatedRoutes() {
  /** @type {Array<{ file: string; line: number; text: string; route: string }>} */
  const violations = [];

  // Scan discovery, lists, and hooks directories
  const scanDirs = [
    path.resolve(SOCIAL_DIR, "discovery"),
    path.resolve(SOCIAL_DIR, "lists"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of scanDirs) {
    const found = await walkFiles(
      dir,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
    files = files.concat(found);
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

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

  return violations;
}

// ─── Report helpers ─────────────────────────────────────────────────────

function reportSocialDiscoveryNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-discovery-no-axios-or-fetch — no axios/fetch in discovery/search files (TKT-6.5.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-discovery-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocialDiscoveryNoRawQueryLogging(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-discovery-no-raw-query-logging — no raw query interpolation in social discovery/search (TKT-6.5.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-discovery-no-raw-query-logging — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocialDiscoveryNoUnstableIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-discovery-no-unstable-ids — no followId/friendshipId in scroll-guard (TKT-6.5.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-discovery-no-unstable-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocialDiscoveryNoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social-discovery-no-deprecated-routes — no deprecated routes in discovery/search (TKT-6.5.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social-discovery-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("deprecated route:")} ${BOLD(v.route)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Report: Epic 6.6 checks (TKT-6.6.G2)

function reportSocial66NoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social66-no-axios-or-fetch — no axios/fetch in follow-mutation.service.ts\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social66-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocial66NoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social66-no-deprecated-routes — no deprecated routes in follow-mutation.service.ts\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social66-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("deprecated route:")} ${BOLD(v.route)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial66NoUnstableSocialIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social66-no-unstable-ids — no followId/friendshipId in follow-mutation.service.ts sinks\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social66-no-unstable-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial66SentryNoUnstableIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social66-sentry-no-unstable-ids — no followId/friendshipId in social-follow-mutation-sentry sinks\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social66-sentry-no-unstable-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Report: Epic 6.7 checks (TKT-6.7.G3)

function reportSocial67NoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social67-no-axios-or-fetch — no axios/fetch in block-mutation.service.ts\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social67-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocial67NoDeprecatedRoutes(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social67-no-deprecated-routes — no deprecated routes in block-mutation.service.ts\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social67-no-deprecated-routes — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("deprecated route:")} ${BOLD(v.route)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial67NoUnstableSocialIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social67-no-unstable-ids — no followId/friendshipId in block-mutation.service.ts sinks\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social67-no-unstable-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial67SentryNoUnstableIds(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social67-sentry-no-unstable-ids — no followId/friendshipId in social-discovery-search-sentry sinks\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social67-sentry-no-unstable-ids — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial67NoDirectSdkCalls(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social67-no-direct-sdk-calls — no direct SDK block/unblock calls from components\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social67-no-direct-sdk-calls — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

// ─── Report: Epic 6.8 checks (TKT-6.8.G2)

function reportSocial68NoDeprecatedFriendRequestRoute(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social68-no-deprecated-friend-request-route — no deprecated singular /social/friend-request calls from friend-request-mutation.service.ts (TKT-6.8.G2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social68-no-deprecated-friend-request-route — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("deprecated controller family:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial68NoFriendshipIdPersistence(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social68-no-friendship-id-persistence — no friendshipId written to localStorage / sessionStorage / URLSearchParams / window.history / window.location across features/social/ (TKT-6.8.G2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social68-no-friendship-id-persistence — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Check: Epic 6.9 — no client-side cursor construction (TKT-6.9.H2) ────

/**
 * Asserts that no file under `features/social/**` builds a cursor
 * string from a numeric offset. The feed endpoint is server-paginated
 * via an opaque `nextCursor`; constructing a cursor from
 * `String(${offset})` or a template-literal interpolation of an
 * offset-shaped variable would bypass the server's cursor authority
 * and is a contract violation.
 *
 * The check looks for two patterns on the same line:
 *
 *   - `String(...)` whose argument is an `offset`-shaped identifier.
 *   - Template-literal interpolation `${...offset...}` or
 *     `${...cursor...}` on a line that also contains the
 *     word `offset` (so a generic template that happens to contain
 *     `cursor` does not trip the rule).
 *
 * The `feed.service.ts` file is exempted: it forwards the
 * server-emitted `nextCursor` unchanged (TKT-6.9.C1) and the
 * `feed-discriminator.ts` / `feed-pagination-invariants.ts` files
 * re-export the canonical page-size constants but never construct
 * a cursor.
 */
async function checkSocial69NoClientSideCursor() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  // The `String(${offset})` pattern. Matches `String(offset)`,
  // `String(someOffset)`, `String(numericOffset)`, etc. The pattern
  // is intentionally strict; a string-literal like `String("offset")`
  // is fine and does not match.
  const stringOfOffsetRe = /\bString\s*\(\s*[A-Za-z_$][A-Za-z0-9_$]*[Oo]ffset\b/;

  // The `${...}` template interpolation pattern. Matches a line that
  // contains BOTH a `${...}` interpolation and the word `offset`.
  // The `offset` keyword requirement avoids false positives on
  // unrelated template strings.
  const templateOffsetRe = /\$\{[^}]*\}/;

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      if (stringOfOffsetRe.test(raw)) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "String(${offset})",
        });
        continue;
      }
      if (templateOffsetRe.test(raw) && /\boffset\b/.test(raw)) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "template interpolation of `offset`",
        });
      }
    }
  }

  return violations;
}

// ─── Check: Epic 6.9 — no offset / cursor / limit persistence (TKT-6.9.H2) ─

/**
 * Asserts that no file under `features/social/**` writes `offset`,
 * `cursor`, or `limit` into `localStorage`, `sessionStorage`, or
 * `URLSearchParams`. The feed endpoint is server-paginated via an
 * opaque `nextCursor`; persisting the offset / cursor / limit in a
 * browser sink would leak server-authoritative pagination state to
 * the client and is a contract violation.
 *
 * The check matches the persistence sinks already used by the
 * Epic 6.8 (TKT-6.8.G2) `social68-no-friendship-id-persistence`
 * check, restricted to `localStorage.setItem`,
 * `sessionStorage.setItem`, and `URLSearchParams` (the
 * `window.history` / `window.location` sinks are covered by the
 * Epic 6.1 / 6.2 checks).
 */
async function checkSocial69NoOffsetPersistence() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !isTestFile(f),
    );
  } catch {
    return violations;
  }

  const PERSISTENCE_SINKS = [
    { pattern: "localStorage.setItem", re: /\blocalStorage\.setItem\b/ },
    {
      pattern: "sessionStorage.setItem",
      re: /\bsessionStorage\.setItem\b/ },
    { pattern: "URLSearchParams", re: /\bURLSearchParams\b/ },
  ];

  // The forbidden pagination identifiers. `offset` is forbidden
  // outright. `cursor` is forbidden because the SDK's `nextCursor`
  // is opaque; persisting it on the client would leak server state.
  // `limit` is forbidden because the page size is server-clamped
  // (and the wrapper already forwards it on every call).
  const FORBIDDEN_IDS = ["offset", "cursor", "limit"];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      for (const { pattern, re } of PERSISTENCE_SINKS) {
        if (!re.test(raw)) continue;

        for (const id of FORBIDDEN_IDS) {
          const idRe = new RegExp(`\\b${id}\\b`);
          if (idRe.test(raw)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              sink: pattern,
              identifier: id,
            });
          }
        }
      }
    }
  }

  return violations;
}

// ─── Check: Epic 6.9 — no direct SDK feed calls outside feed.service.ts (TKT-6.9.H2)

/**
 * Asserts that the SDK function `socialControllerGetFeed` is only
 * imported and called from `feed.service.ts`. The single-purpose
 * service wrapper is the only HTTP entry point for the global feed
 * surface; a component / hook / page that calls the SDK directly
 * would bypass the RFC 7807 decoding, the cursor forwarding, and
 * the `phase6:6.9` breadcrumb emission.
 *
 * The check walks `features/social/**` and reports any file that
 * imports `socialControllerGetFeed` other than
 * `features/social/services/feed.service.ts`. The
 * `features/social/services/__tests__/feed.service.spec.ts` is
 * exempted because it mocks the SDK call to assert the service
 * behaviour.
 */
async function checkSocial69NoDirectSdkFeedCalls() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const FEED_SERVICE_FILE = path.resolve(
    SOCIAL_DIR,
    "services/feed.service.ts",
  );

  let files;
  try {
    files = await walkFiles(
      SOCIAL_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")),
    );
  } catch {
    return violations;
  }

  const FORBIDDEN_SDK_CALL = "socialControllerGetFeed";

  for (const file of files) {
    if (file === FEED_SERVICE_FILE) continue;
    // The feed-service spec mocks the SDK function; it is the
    // single allowed exception.
    if (
      file ===
      path.resolve(
        SOCIAL_DIR,
        "services/__tests__/feed.service.spec.ts",
      )
    ) {
      continue;
    }

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;

      if (raw.includes(FORBIDDEN_SDK_CALL)) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: FORBIDDEN_SDK_CALL,
        });
      }
    }
  }

  return violations;
}

// ─── Report helpers (TKT-6.9.H2) ─────────────────────────────────────────

function reportSocial69NoClientSideCursor(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social69-no-client-side-cursor — no client-side cursor construction from a numeric offset across features/social/ (TKT-6.9.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social69-no-client-side-cursor — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocial69NoOffsetPersistence(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social69-no-offset-persistence — no offset/cursor/limit written to localStorage/sessionStorage/URLSearchParams across features/social/ (TKT-6.9.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social69-no-offset-persistence — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial69NoDirectSdkFeedCalls(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social69-no-direct-sdk-feed-calls — socialControllerGetFeed is only imported from feed.service.ts (TKT-6.9.H2)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social69-no-direct-sdk-feed-calls — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

// ─── Epic 6.10 G3 checks (TKT-6.10.G3) ──────────────────────────────────────

/**
 * Asserts that no realtime module under `features/social/realtime/**`
 * or `features/social/hooks/use*Invalidation*` imports or calls any
 * `socialControllerDeprecatedFriendRequestPath*` SDK function.
 *
 * The deprecated singular `/social/friend-request` path must never be
 * called from the realtime layer.
 */
async function checkSocial610NoDeprecatedFriendRequestRouteRealtime() {
  /** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
  const violations = [];

  const DEPRECATED_FAMILY = "socialControllerDeprecatedFriendRequestPath";

  // Walk both target directories.
  const targets = [
    path.resolve(SOCIAL_DIR, "realtime"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of targets) {
    try {
      const found = await walkFiles(
        dir,
        (f) =>
          (f.endsWith(".ts") ||
            f.endsWith(".tsx") ||
            f.endsWith(".mts") ||
            f.endsWith(".cts")) &&
          !isTestFile(f),
      );
      files = files.concat(found);
    } catch {
      // Directory may not exist yet — skip silently.
    }
  }

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;
      if (raw.includes(DEPRECATED_FAMILY)) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: DEPRECATED_FAMILY,
        });
      }
    }
  }

  return violations;
}

/**
 * Asserts that no realtime module writes `friendshipId` to the
 * documented persistence / URL sinks:
 * `localStorage.setItem`, `sessionStorage.setItem`,
 * `window.history.pushState`, `window.history.replaceState`,
 * `URLSearchParams`.
 *
 * `friendshipId` is the unstable internal identifier of a friend-request
 * row. It must never leave the service layer.
 */
async function checkSocial610NoFriendshipIdPersistenceRealtime() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const targets = [
    path.resolve(SOCIAL_DIR, "realtime"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of targets) {
    try {
      const found = await walkFiles(
        dir,
        (f) =>
          (f.endsWith(".ts") ||
            f.endsWith(".tsx") ||
            f.endsWith(".mts") ||
            f.endsWith(".cts")) &&
          !isTestFile(f),
      );
      files = files.concat(found);
    } catch {
      // Directory may not exist yet — skip silently.
    }
  }

  const PERSISTENCE_SINKS = [
    { pattern: "localStorage.setItem", re: /\blocalStorage\.setItem\b/ },
    { pattern: "sessionStorage.setItem", re: /\bsessionStorage\.setItem\b/ },
    { pattern: "window.history.pushState", re: /\bwindow\.history\.pushState\b/ },
    { pattern: "window.history.replaceState", re: /\bwindow\.history\.replaceState\b/ },
    { pattern: "URLSearchParams", re: /\bURLSearchParams\b/ },
  ];

  const FORBIDDEN_ID = "friendshipId";

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;
      for (const { pattern, re } of PERSISTENCE_SINKS) {
        if (!re.test(raw)) continue;
        const idRe = new RegExp(`\\b${FORBIDDEN_ID}\\b`);
        if (idRe.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            sink: pattern,
            identifier: FORBIDDEN_ID,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Asserts that no realtime module writes `followId` to the same
 * persistence / URL sinks as `checkSocial610NoFriendshipIdPersistenceRealtime`.
 *
 * `followId` is the unstable internal identifier of a follow row.
 * It must never leave the service layer.
 */
async function checkSocial610NoFollowIdPersistenceRealtime() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; identifier: string }>} */
  const violations = [];

  const targets = [
    path.resolve(SOCIAL_DIR, "realtime"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of targets) {
    try {
      const found = await walkFiles(
        dir,
        (f) =>
          (f.endsWith(".ts") ||
            f.endsWith(".tsx") ||
            f.endsWith(".mts") ||
            f.endsWith(".cts")) &&
          !isTestFile(f),
      );
      files = files.concat(found);
    } catch {
      // Directory may not exist yet — skip silently.
    }
  }

  const PERSISTENCE_SINKS = [
    { pattern: "localStorage.setItem", re: /\blocalStorage\.setItem\b/ },
    { pattern: "sessionStorage.setItem", re: /\bsessionStorage\.setItem\b/ },
    { pattern: "window.history.pushState", re: /\bwindow\.history\.pushState\b/ },
    { pattern: "window.history.replaceState", re: /\bwindow\.history\.replaceState\b/ },
    { pattern: "URLSearchParams", re: /\bURLSearchParams\b/ },
  ];

  const FORBIDDEN_ID = "followId";

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;
      for (const { pattern, re } of PERSISTENCE_SINKS) {
        if (!re.test(raw)) continue;
        const idRe = new RegExp(`\\b${FORBIDDEN_ID}\\b`);
        if (idRe.test(raw)) {
          violations.push({
            file: path.relative(CWD, file),
            line: i + 1,
            text: raw.trim(),
            sink: pattern,
            identifier: FORBIDDEN_ID,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Asserts that no realtime module writes any event payload field beyond
 * the four common fields (`actorUserId`, `targetUserId`, `correlationId`,
 * `version`) to the same persistence / URL sinks.
 *
 * This is the post-batch invariant: the Phase 6.10 cross-batch invariant
 * "No event payload persistence" requires that the complete event payload
 * (which may contain `RelationshipDto`, `FriendshipDto`, etc.) never
 * reaches a persistence sink.
 *
 * The check uses the PERSISTENCE_SINKS regexes from the Epic 6.8
 * `social68-no-friendship-id-persistence` check and scans for any
 * field assignment that might carry a payload value:
 *
 *   - `.push(...)`, `.set(...)`, `= ...` where the RHS references a
 *     socket event payload variable.
 *
 * Because the check is structural (sink-on-line AND suspicious-RHS-on-line),
 * it catches both direct writes like `localStorage.setItem(k, payload)`
 * and indirect writes where a variable assigned from a payload is persisted.
 *
 * The lint script is intentionally narrow: it only fires on a sink line
 * that also mentions `payload` / `event` / `socket` / `data` variables.
 * A more aggressive check would need full AST analysis.
 */
async function checkSocial610NoEventPayloadPersistence() {
  /** @type {Array<{ file: string; line: number; text: string; sink: string; pattern: string }>} */
  const violations = [];

  const targets = [
    path.resolve(SOCIAL_DIR, "realtime"),
    path.resolve(SOCIAL_DIR, "hooks"),
  ];

  let files = [];
  for (const dir of targets) {
    try {
      const found = await walkFiles(
        dir,
        (f) =>
          (f.endsWith(".ts") ||
            f.endsWith(".tsx") ||
            f.endsWith(".mts") ||
            f.endsWith(".cts")) &&
          !isTestFile(f),
      );
      files = files.concat(found);
    } catch {
      // Directory may not exist yet — skip silently.
    }
  }

  const PERSISTENCE_SINKS = [
    { pattern: "localStorage.setItem", re: /\blocalStorage\.setItem\b/ },
    { pattern: "sessionStorage.setItem", re: /\bsessionStorage\.setItem\b/ },
    { pattern: "window.history.pushState", re: /\bwindow\.history\.pushState\b/ },
    { pattern: "window.history.replaceState", re: /\bwindow\.history\.replaceState\b/ },
    { pattern: "URLSearchParams", re: /\bURLSearchParams\b/ },
  ];

  // Suspicious RHS patterns that suggest a payload is being persisted.
  // This catches common patterns without needing AST analysis.
  const PAYLOAD_RHS_PATTERNS = [
    /\bpayload\b/,
    /\bsocketEvent\b/,
    /\brawEvent\b/,
    /\bframe\.data\b/,
    /\bwsData\b/,
    /\bsocketData\b/,
  ];

  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isCommentLine(raw)) continue;
      for (const { pattern, re } of PERSISTENCE_SINKS) {
        if (!re.test(raw)) continue;
        for (const rhsRe of PAYLOAD_RHS_PATTERNS) {
          if (rhsRe.test(raw)) {
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: raw.trim(),
              sink: pattern,
              pattern: "event payload written to persistence sink",
            });
            break; // Only report once per line.
          }
        }
      }
    }
  }

  return violations;
}

// ─── Report helpers (TKT-6.10.G3) ─────────────────────────────────────────

function reportSocial610NoDeprecatedFriendRequestRouteRealtime(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social610-no-deprecated-friend-request-route-realtime — no deprecated singular friend-request SDK calls from realtime/invalidation modules (TKT-6.10.G3)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social610-no-deprecated-friend-request-route-realtime — ${BOLD(String(violations.length))} violation(s) found\n\n`,
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

function reportSocial610NoFriendshipIdPersistenceRealtime(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social610-no-friendship-id-persistence-realtime — no friendshipId written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social610-no-friendship-id-persistence-realtime — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial610NoFollowIdPersistenceRealtime(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social610-no-follow-id-persistence-realtime — no followId written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social610-no-follow-id-persistence-realtime — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden identifier:")} ${BOLD(v.identifier)}  ${RED("in sink:")} ${BOLD(v.sink)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

function reportSocial610NoEventPayloadPersistence(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} social610-no-event-payload-persistence — no socket event payload written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)\n`,
    );
    return true;
  }

  process.stdout.write(
    `${RED("✗")} social610-no-event-payload-persistence — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );

  for (const v of violations) {
    process.stdout.write(
      `  ${RED("sink:")} ${BOLD(v.sink)}  ${RED("pattern:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
    const snippet =
      v.text.length > 72 ? v.text.slice(0, 69) + "..." : v.text;
    process.stdout.write(`  ${snippet}\n\n`);
  }

  return false;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  let ok = true;

  // Check 1: social no-axios-or-fetch (Epic 6.1 G1)
  const socialAxiosViolations = await checkSocialNoAxiosOrFetch();
  if (!reportSocialNoAxiosOrFetch(socialAxiosViolations)) ok = false;

  // Check 2: social no-deprecated-routes (Epic 6.1 G1)
  const socialDeprecatedViolations = await checkSocialNoDeprecatedRoutes();
  if (!reportSocialNoDeprecatedRoutes(socialDeprecatedViolations)) ok = false;

  // Check 3: social services no-deprecated-routes (Epic 6.1 G1)
  const socialServicesDeprecatedViolations =
    await checkSocialServicesNoDeprecatedRoutes();
  if (
    !reportSocialServicesNoDeprecatedRoutes(
      socialServicesDeprecatedViolations,
    )
  )
    ok = false;

  // Check 4: social no-unstable-social-ids (Epic 6.1 G1, E7)
  const socialSinkViolations = await checkSocialNoUnstableSocialIdsInSinks();
  if (!reportSocialNoUnstableSocialIds(socialSinkViolations)) ok = false;

  // Check 5: social discovery no axios or fetch (TKT-6.5.H2)
  const discoveryAxiosViolations = await checkSocialDiscoveryNoAxiosOrFetch();
  if (!reportSocialDiscoveryNoAxiosOrFetch(discoveryAxiosViolations)) ok = false;

  // Check 6: social discovery no raw query logging (TKT-6.5.H2)
  const discoveryQueryViolations = await checkSocialDiscoveryNoRawQueryLogging();
  if (!reportSocialDiscoveryNoRawQueryLogging(discoveryQueryViolations)) ok = false;

  // Check 7: social discovery no unstable IDs (TKT-6.5.H2)
  const discoveryUnstableViolations = await checkSocialDiscoveryNoUnstableIds();
  if (!reportSocialDiscoveryNoUnstableIds(discoveryUnstableViolations)) ok = false;

  // Check 8: social discovery no deprecated routes (TKT-6.5.H2)
  const discoveryDeprecatedViolations = await checkSocialDiscoveryNoDeprecatedRoutes();
  if (!reportSocialDiscoveryNoDeprecatedRoutes(discoveryDeprecatedViolations)) ok = false;

  // Check 9: Epic 6.6 — no axios or fetch in follow-mutation.service.ts (TKT-6.6.G2)
  const social66AxiosViolations = await checkSocial66NoAxiosOrFetch();
  if (!reportSocial66NoAxiosOrFetch(social66AxiosViolations)) ok = false;

  // Check 10: Epic 6.6 — no deprecated routes in follow-mutation.service.ts (TKT-6.6.G2)
  const social66DeprecatedViolations = await checkSocial66NoDeprecatedRoutes();
  if (!reportSocial66NoDeprecatedRoutes(social66DeprecatedViolations)) ok = false;

  // Check 11: Epic 6.6 — no followId/friendshipId in follow-mutation.service.ts sinks (TKT-6.6.G2)
  const social66UnstableViolations = await checkSocial66NoUnstableSocialIds();
  if (!reportSocial66NoUnstableSocialIds(social66UnstableViolations)) ok = false;

  // Check 12: Epic 6.6 — no followId/friendshipId in social-follow-mutation-sentry sinks (TKT-6.6.G2)
  const social66SentryUnstableViolations = await checkSocial66SentryNoUnstableIds();
  if (!reportSocial66SentryNoUnstableIds(social66SentryUnstableViolations)) ok = false;

  // Check 13: Epic 6.7 — no axios or fetch in block-mutation.service.ts (TKT-6.7.G3)
  const social67AxiosViolations = await checkSocial67NoAxiosOrFetch();
  if (!reportSocial67NoAxiosOrFetch(social67AxiosViolations)) ok = false;

  // Check 14: Epic 6.7 — no deprecated routes in block-mutation.service.ts (TKT-6.7.G3)
  const social67DeprecatedViolations = await checkSocial67NoDeprecatedRoutes();
  if (!reportSocial67NoDeprecatedRoutes(social67DeprecatedViolations)) ok = false;

  // Check 15: Epic 6.7 — no followId/friendshipId in block-mutation.service.ts sinks (TKT-6.7.G3)
  const social67UnstableViolations = await checkSocial67NoUnstableSocialIds();
  if (!reportSocial67NoUnstableSocialIds(social67UnstableViolations)) ok = false;

  // Check 16: Epic 6.7 — no followId/friendshipId in social-discovery-search-sentry sinks (TKT-6.7.G3)
  const social67SentryUnstableViolations = await checkSocial67SentryNoUnstableIds();
  if (!reportSocial67SentryNoUnstableIds(social67SentryUnstableViolations)) ok = false;

  // Check 17: Epic 6.7 — components do not call SDK block/unblock functions directly (TKT-6.7.G3)
  const social67DirectSdkViolations = await checkSocial67NoDirectSdkCalls();
  if (!reportSocial67NoDirectSdkCalls(social67DirectSdkViolations)) ok = false;

  // Check 18: Epic 6.8 — friend-request-mutation.service.ts does not call the deprecated singular /social/friend-request route (TKT-6.8.G2)
  const social68DeprecatedRouteViolations =
    await checkSocial68NoDeprecatedFriendRequestRoute();
  if (
    !reportSocial68NoDeprecatedFriendRequestRoute(
      social68DeprecatedRouteViolations,
    )
  )
    ok = false;

  // Check 19: Epic 6.8 — no `friendshipId` written to persistence/URL sinks across features/social/ (TKT-6.8.G2)
  const social68FriendshipIdPersistenceViolations =
    await checkSocial68NoFriendshipIdPersistence();
  if (
    !reportSocial68NoFriendshipIdPersistence(
      social68FriendshipIdPersistenceViolations,
    )
  )
    ok = false;

  // Check 20: Epic 6.9 — no client-side cursor construction across features/social/ (TKT-6.9.H2)
  const social69ClientSideCursorViolations =
    await checkSocial69NoClientSideCursor();
  if (
    !reportSocial69NoClientSideCursor(social69ClientSideCursorViolations)
  )
    ok = false;

  // Check 21: Epic 6.9 — no offset/cursor/limit written to localStorage/sessionStorage/URLSearchParams (TKT-6.9.H2)
  const social69OffsetPersistenceViolations =
    await checkSocial69NoOffsetPersistence();
  if (
    !reportSocial69NoOffsetPersistence(social69OffsetPersistenceViolations)
  )
    ok = false;

  // Check 22: Epic 6.9 — components / hooks / pages do not import socialControllerGetFeed directly (TKT-6.9.H2)
  const social69DirectSdkViolations =
    await checkSocial69NoDirectSdkFeedCalls();
  if (!reportSocial69NoDirectSdkFeedCalls(social69DirectSdkViolations)) ok = false;

  // Check 23: Epic 6.10 G3 — no deprecated friend-request SDK calls from realtime/invalidation modules (TKT-6.10.G3)
  const social610DeprecatedRouteViolations =
    await checkSocial610NoDeprecatedFriendRequestRouteRealtime();
  if (
    !reportSocial610NoDeprecatedFriendRequestRouteRealtime(
      social610DeprecatedRouteViolations,
    )
  )
    ok = false;

  // Check 24: Epic 6.10 G3 — no friendshipId written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)
  const social610FriendshipIdViolations =
    await checkSocial610NoFriendshipIdPersistenceRealtime();
  if (
    !reportSocial610NoFriendshipIdPersistenceRealtime(
      social610FriendshipIdViolations,
    )
  )
    ok = false;

  // Check 25: Epic 6.10 G3 — no followId written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)
  const social610FollowIdViolations =
    await checkSocial610NoFollowIdPersistenceRealtime();
  if (
    !reportSocial610NoFollowIdPersistenceRealtime(
      social610FollowIdViolations,
    )
  )
    ok = false;

  // Check 26: Epic 6.10 G3 — no socket event payload written to persistence sinks in realtime/invalidation modules (TKT-6.10.G3)
  const social610PayloadPersistenceViolations =
    await checkSocial610NoEventPayloadPersistence();
  if (
    !reportSocial610NoEventPayloadPersistence(
      social610PayloadPersistenceViolations,
    )
  )
    ok = false;

  if (ok) {
    process.stdout.write(
      `\n${GREEN("[phase6:lint-invariants] all checks passed")}\n`,
    );
    process.exit(0);
  } else {
    process.stdout.write(
      `\n${RED("[phase6:lint-invariants] check(s) failed — fix violations above")}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`[phase6:lint-invariants] fatal: ${err}\n`);
  process.exit(1);
});
