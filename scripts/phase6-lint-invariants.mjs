#!/usr/bin/env node
/**
 * phase6-lint-invariants.mjs — Phase 6 cross-batch invariant gate.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source ticket: TKT-6.1.G1.
 *
 * Encodes the Phase 6 cross-batch invariants that complement the existing
 * `phase5-lint-invariants.mjs` script. Phase 6 introduces a new
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
 * The script is intentionally split from `phase5-lint-invariants.mjs` so
 * the existing Phase 5 checks (which already include a service-wide
 * no-axios / no-deprecated-routes gate) are not perturbed by Phase 6
 * additions. The `package.json` `phase6:lint-invariants` script is the
 * canonical entry point.
 *
 * ## Usage
 *
 *   node scripts/phase6-lint-invariants.mjs [--help]
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
const APP_SOCIAL_DIR = path.resolve(APP_DIR, "social");
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
  node scripts/phase6-lint-invariants.mjs [--help]

Checks (always run):
  social-no-axios-or-fetch          No axios/fetch in non-service files under features/social/.
  social-no-deprecated-routes       No DEPRECATED_ROUTES calls from any features/social/ file.
  social-no-unstable-social-ids     No followId/friendshipId written to URL/localStorage/Sentry sinks.
                                    Scans features/social/** and app/social/** (TKT-6.2.G3).
  social-services-no-deprecated-routes  Explicit reinforcement for the services/ subdirectory.
  social-discovery-no-axios-or-fetch (TKT-6.5.H2) No axios/fetch in discovery/search files.
  social-discovery-no-raw-query-logging (TKT-6.5.H2) No raw query interpolation in social discovery/search.
  social-discovery-no-unstable-ids (TKT-6.5.H2) No followId/friendshipId in scroll-guard.
  social-discovery-no-deprecated-routes (TKT-6.5.H2) Explicit reinforcement for discovery/search.
  social66-no-axios-or-fetch (TKT-6.6.G2) No axios/fetch in follow-mutation.service.ts.
  social66-no-deprecated-routes (TKT-6.6.G2) No deprecated routes in follow-mutation.service.ts.
  social66-no-unstable-ids (TKT-6.6.G2) No followId/friendshipId in follow-mutation.service.ts sinks.
  social66-sentry-no-unstable-ids (TKT-6.6.G2) No followId/friendshipId in phase6_6_6_sentry sinks.
  social67-no-axios-or-fetch (TKT-6.7.G3) No axios/fetch in block-mutation.service.ts.
  social67-no-deprecated-routes (TKT-6.7.G3) No deprecated routes in block-mutation.service.ts.
  social67-no-unstable-ids (TKT-6.7.G3) No followId/friendshipId in block-mutation.service.ts sinks.
  social67-sentry-no-unstable-ids (TKT-6.7.G3) No followId/friendshipId in phase6_6_7_sentry sinks.
  social67-no-direct-sdk-calls (TKT-6.7.G3) Components do not import socialControllerBlockUser/socialControllerUnblockUser.
  social68-no-deprecated-friend-request-route (TKT-6.8.G2) friend-request-mutation.service.ts does not import the deprecated singular /social/friend-request SDK family.
  social68-no-friendship-id-persistence (TKT-6.8.G2) No friendshipId written to localStorage/sessionStorage/URLSearchParams/window.history/window.location across features/social/.

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
  // surface to `app/social/**` so any Server Component route
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
        /phase6_6_6_sentry/.test(f),
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
        /phase6_6_7_sentry/.test(f),
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
      `${GREEN("✓")} social-no-unstable-social-ids — no followId/friendshipId written to URL/localStorage/Sentry sinks (features/social/** + app/social/**)\n`,
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
      `${GREEN("✓")} social66-sentry-no-unstable-ids — no followId/friendshipId in phase6_6_6_sentry sinks\n`,
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
      `${GREEN("✓")} social67-sentry-no-unstable-ids — no followId/friendshipId in phase6_6_7_sentry sinks\n`,
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

  // Check 12: Epic 6.6 — no followId/friendshipId in phase6_6_6_sentry sinks (TKT-6.6.G2)
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

  // Check 16: Epic 6.7 — no followId/friendshipId in phase6_6_7_sentry sinks (TKT-6.7.G3)
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
