#!/usr/bin/env node
/**
 * admin-lint-invariants.mjs — Phase 7 admin cross-batch invariant gate.
 *
 * Source epic:   Epic 7.1 — Admin foundations.
 * Source ticket: TKT-7.1.B6.
 *
 * Encodes the Phase 7 cross-batch invariants that complement the existing
 * `realtime-lint-invariants.mjs` and `social-lint-invariants.mjs` scripts.
 *
 * ## Checks
 *
 *   1. **admin-no-axios-or-fetch** — No file under `features/admin/**`
 *      (excluding the `services/` subdirectory and `__tests__/`) may
 *      import `axios` or call `fetch(` directly. All HTTP traffic must
 *      flow through the service wrappers (TKT-7.1.D1).
 *
 *   2. **admin-permission-map-exhaustive** — Every documented
 *      `AdminPermission` in `features/admin/permissions.ts` must be
 *      covered for at least one role slug in
 *      `useAdminRole.ts` `ROLE_PERMISSION_MAP`. The lint guard catches
 *      the case where a new permission is added but no slug grants
 *      it, leaving the `usePermission` hook permanently `false` for
 *      every user.
 *
 *   3. **irreversible-confirm-invariants-hold** — The irreversible
 *      confirm catalogue in `admin-capabilities.ts` must satisfy every
 *      invariant documented in
 *      `irreversible-confirm-invariants.ts`
 *      (`minLength`, `caseSensitive`, `whitespaceSensitive`,
 *      `nonTrivial`). The structural check mirrors the runtime
 *      `assertIrreversibleInvariantsHold` helper.
 *
 *   4. **irreversible-confirm-unique** — Every irreversible operation
 *      has a unique confirm string. Mirrors the runtime
 *      `findDuplicateIrreversibleConfirmStrings` helper.
 *
 *   5. **admin-error-codes-have-copy** — Every admin error code added
 *      to `error-codes.ts` must have matching copy in the priority
 *      copy block. Verified by string scan; this is a structural
 *      safety net (TypeScript already enforces the union).
 *
 *   6. **admin-feature-flags-have-subflags** — All eight Phase 7
 *      admin feature flags are present in `feature-flags.ts` and the
 *      seven sub-flags document `admin_live` as a prerequisite.
 *      Re-asserted here so a future flag-system refactor that loses
 *      the documented relationship will fail at lint time.
 *
 *   7. **admin-import-boundary** (TKT-7.2.A2) — The admin route group
 *      (`src/app/(protected)/admin/**`) is the only consumer of admin services and
 *      admin components. A non-admin `src/features/**` folder must not
 *      import from `src/features/admin/services/**` or
 *      `src/features/admin/components/**` (hooks are exempt because
 *      `usePermission`, `useAdminRole`, `useAdminFeatureFlag`, etc. are
 *      shared primitives reused by Epic 7.1 specs and the future admin
 *      layout). Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` are exempt
 *      because they explicitly link the admin module into the
 *      cross-feature smoke check.
 *
 *   8. **tag-admin-no-legacy-imports** (TKT-7.3.H3) — No file under
 *      `features/admin/tag-admin/**` may import the legacy
 *      `@/features/tags/api/tags-admin` module. Tag-admin code must
 *      reach the SDK via `features/admin/services/tag-admin.service.ts`.
 *
 *   9. **tag-admin-sdk-boundary** (TKT-7.3.H3) — Outside the
 *      `features/admin/tag-admin/**` and `features/admin/services/**`
 *      folders, only the admin route group (`src/app/(protected)/admin/**`) and
 *      admin feature folder (`src/features/admin/**`) may import the
 *      tag admin SDK service. No `src/features/**` file outside the
 *      admin folder may import
 *      `@/features/admin/services/tag-admin.service`.
 *      Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 *  10. *(reserved)* — The Epic 7.4 ticket TKT-7.4.H3 originally planned
 *      a `category-admin-no-legacy-imports` check analogous to the
 *      tag-admin one (check 8). After A1 backend evidence, no legacy
 *      category-admin module exists in the codebase — only the public
 *      `listCategories` read fallback (documented in `EPIC_7_4_A1.md`
 *      §6). The inverse boundary (no non-admin file imports the admin
 *      category service directly) is enforced by check 11 below.
 *
 *  11. **category-admin-sdk-boundary** (TKT-7.4.H3) — Outside the
 *      `features/admin/category-admin/**` and
 *      `features/admin/services/**` folders, only the admin route
 *      group (`src/app/(protected)/admin/**`) and admin feature folder
 *      (`src/features/admin/**`) may import the category admin SDK
 *      service (`@/features/admin/services/category-admin.service`).
 *      No `src/features/**` file outside the admin folder may import
 *      `@/features/admin/services/category-admin.service`. Cross-feature
 *      integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 *  12. **review-moderation-no-sdk-leak** (TKT-7.5.H3) — No file under
 *      `features/admin/review-moderation/**` may import the regenerated
 *      review SDK directly (`@/lib/api/generated/reviews/reviews` or
 *      `@/lib/api/generated/reviews/...`). All review-moderation HTTP
 *      traffic must flow through
 *      `features/admin/services/review-moderation.service.ts`. Mirrors
 *      the tag-admin (`tag-admin-no-legacy-imports`) and category-admin
 *      (`category-admin-sdk-boundary`) enforcement shape.
 *
 *  13. **review-moderation-service-boundary** (TKT-7.5.H3) — Outside
 *      `features/admin/review-moderation/**`, only the
 *      `features/admin/services/**` folder, the admin route group
 *      (`src/app/(protected)/admin/**`), and the admin feature folder
 *      (`src/features/admin/**`) may import the review-moderation
 *      service (`@/features/admin/services/review-moderation.service`).
 *      Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 *  14. **comment-moderation-no-sdk-leak** (TKT-7.6.H3) — No file under
 *      `features/admin/comment-moderation/**` may import the
 *      regenerated comment SDK directly
 *      (`@/lib/api/generated/comments/...`). All comment-moderation
 *      HTTP traffic must flow through
 *      `features/admin/services/comment-moderation.service.ts`. Mirrors
 *      the review-moderation (`review-moderation-no-sdk-leak`),
 *      tag-admin (`tag-admin-no-legacy-imports`), and category-admin
 *      (`category-admin-sdk-boundary`) enforcement shape.
 *
 *  15. **comment-moderation-service-boundary** (TKT-7.6.H3) — Outside
 *      `features/admin/comment-moderation/**`, only the
 *      `features/admin/services/**` folder, the admin route group
 *      (`src/app/(protected)/admin/**`), and the admin feature folder
 *      (`src/features/admin/**`) may import the comment-moderation
 *      service (`@/features/admin/services/comment-moderation.service`).
 *      Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *      Mirrors `review-moderation-service-boundary`.
 *
 * 16. **tournament-admin-no-sdk-leak** (TKT-7.7.H3) — No file under
 *      `features/admin/tournament-admin/**` may import the
 *      regenerated tournament SDK directly. All tournament-admin HTTP
 *      traffic must flow through
 *      `features/admin/services/tournament-admin.service.ts`. Mirrors
 *      the review-moderation (`review-moderation-no-sdk-leak`),
 *      tag-admin (`tag-admin-no-legacy-imports`), and category-admin
 *      (`category-admin-sdk-boundary`) enforcement shapes.
 *
 * 17. **tournament-admin-service-boundary** (TKT-7.7.H3) — Outside
 *      `features/admin/tournament-admin/**`, only the
 *      `features/admin/services/**` folder, the admin route group
 *      (`src/app/(protected)/admin/**`), and the admin feature folder
 *      (`src/features/admin/**`) may import the tournament admin
 *      service (`@/features/admin/services/tournament-admin.service`).
 *      Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *      Mirrors `comment-moderation-service-boundary`.
 *
 * 18. **achievement-admin-no-sdk-leak** (TKT-7.8.H3) — No file under
 *      `features/admin/achievement-admin/**` may import the
 *      regenerated achievement SDK directly. All achievement-admin HTTP
 *      traffic must flow through
 *      `features/admin/services/achievement-admin.service.ts`. Mirrors
 *      the tournament-admin (`tournament-admin-no-sdk-leak`) enforcement shape.
 *
 * 19. **achievement-admin-service-boundary** (TKT-7.8.H3) — Outside
 *      `features/admin/achievement-admin/**`, only the
 *      `features/admin/services/**` folder, the admin route group
 *      (`src/app/(protected)/admin/**`), and the admin feature folder
 *      (`src/features/admin/**`) may import the achievement admin
 *      service (`@/features/admin/services/achievement-admin.service`).
 *      Cross-feature integration specs under
 *      `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *      Mirrors `tournament-admin-service-boundary`.
 *
 * ## Usage
 *
 *   node scripts/admin-lint-invariants.mjs [--help]
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
const ADMIN_DIR = path.resolve(CWD, "src/features/admin");
const APP_DIR = path.resolve(CWD, "src/app");
const FEATURE_DIR = path.resolve(CWD, "src/features");
const FEATURE_FLAGS_PATH = path.resolve(CWD, "src/lib/feature-flags/feature-flags.ts");
const ERROR_CODES_PATH = path.resolve(CWD, "src/lib/api/error-codes.ts");
const ADMIN_PERMISSIONS_PATH = path.resolve(ADMIN_DIR, "permissions.ts");
const ADMIN_CAPABILITIES_PATH = path.resolve(ADMIN_DIR, "admin-capabilities.ts");
const ADMIN_ROLE_PATH = path.resolve(ADMIN_DIR, "hooks/useAdminRole.ts");
const TAG_ADMIN_DIR = path.resolve(ADMIN_DIR, "tag-admin");
const TAG_ADMIN_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "tag-admin.service.ts",
);
const CATEGORY_ADMIN_DIR = path.resolve(ADMIN_DIR, "category-admin");
const CATEGORY_ADMIN_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "category-admin.service.ts",
);
const REVIEW_MODERATION_DIR = path.resolve(ADMIN_DIR, "review-moderation");
const REVIEW_MODERATION_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "review-moderation.service.ts",
);
const COMMENT_MODERATION_DIR = path.resolve(ADMIN_DIR, "comment-moderation");
const COMMENT_MODERATION_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "comment-moderation.service.ts",
);
const TOURNAMENT_ADMIN_DIR = path.resolve(ADMIN_DIR, "tournament-admin");
const TOURNAMENT_ADMIN_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "tournament-admin.service.ts",
);
const ACHIEVEMENT_ADMIN_DIR = path.resolve(ADMIN_DIR, "achievement-admin");
const ACHIEVEMENT_ADMIN_SERVICE_PATH = path.resolve(
  ADMIN_DIR,
  "services",
  "achievement-admin.service.ts",
);

// Category-admin-internal service-list helper. The category-admin
// feature must NOT call the SDK's mutation endpoints
// (`createCategory`, `updateCategory`, `deleteCategory`,
// `restoreCategory`) directly; it must go through
// `category-admin.service.ts`. The public read endpoint
// (`listCategories`) is a documented exception (see
// `EPIC_7_4_A1.md` §6) and is consumed only by
// `useCategoryAdminList.ts` — the lint script must not flag this
// consumption because it is the runtime fallback until a dedicated
// admin list endpoint lands.

// Files permitted to use `fetch(` directly. The general admin-rule
// bans direct fetch/axios, but the documented admin-aware identity
// fallback (TKT-7.1.D3) must hit the endpoint before the SDK lands;
// future tickets replace this with a generated SDK call.
const ADMIN_NO_FETCH_EXCEPTIONS = [
  `${path.sep}hooks${path.sep}useAdminIdentity.ts`,
  // user-role-admin/user-search hits the social users/search endpoint
  // which has no generated SDK yet (TKT-X.X). Add a TODO to replace
  // with SDK call when the endpoint is exposed in the generated client.
  `${path.sep}user-role-admin${path.sep}hooks${path.sep}useUserSearch.ts`,
];

// TKT-7.2.A2 — admin-import-boundary.
// Admin services and admin components are consumed exclusively from the
// admin route group (`src/app/(protected)/admin/**`).  Hooks are exempt because
// `usePermission`, `useAdminRole`, `useAdminFeatureFlag`, etc. are
// shared Epic 7.1 primitives reused everywhere.  Integration specs
// under `src/features/shared/__tests__/phase7-*.spec.tsx` are exempt
// because they explicitly link the admin module into cross-feature
// smoke checks.
const ADMIN_IMPORT_EXCEPTIONS = [
  // hooks are shared primitives
  `${path.sep}admin${path.sep}hooks${path.sep}`,
  // Epic 7.1 integration / smoke-check specs
  `${path.sep}shared${path.sep}__tests__${path.sep}phase7`,
];

const ADMIN_DOCUMENTED_ERROR_CODES = [
  "ADMIN_FORBIDDEN",
  "ADMIN_ROLE_NOT_FOUND",
  "ADMIN_ROLE_ALREADY_GRANTED",
  "ADMIN_USER_NOT_FOUND",
  "IRREVERSIBLE_CONFIRM_REQUIRED",
  "RANKING_RECALCULATION_FAILED",
  "RANKING_PERIOD_RESET_FAILED",
  "RANKING_CONSISTENCY_FAILED",
];

const ADMIN_FLAG_NAMES = [
  "admin_live",
  "admin_review_moderation_live",
  "admin_comment_moderation_live",
  "admin_tag_live",
  "admin_category_live",
  "admin_ranking_live",
  "admin_achievement_live",
  "admin_tournament_live",
  "admin_user_role_live",
];

// ─── CLI ──────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/admin-lint-invariants.mjs [--help]

Checks (always run):
  admin-no-axios-or-fetch          No axios/fetch in non-service files under features/admin/.
  admin-permission-map-exhaustive  Every documented AdminPermission is granted by some role.
  irreversible-confirm-invariants-hold  The irreversible-confirm catalogue satisfies all invariants.
  irreversible-confirm-unique      Every irreversible operation has a unique confirm string.
  admin-error-codes-have-copy      Every admin error code has matching priority copy.
  admin-feature-flags-have-subflags All eight Phase 7 admin flags are present + sub-flags reference parent.
  admin-import-boundary           Non-admin features must not import admin services/components (hooks + integration specs exempt).
  tag-admin-no-legacy-imports    features/admin/tag-admin/** files must not import legacy tags-admin api.
  tag-admin-sdk-boundary         Non-admin features must not import features/admin/services/tag-admin.service.
  category-admin-sdk-boundary   Non-admin features must not import features/admin/services/category-admin.service.
  review-moderation-no-sdk-leak features/admin/review-moderation/** must not import the regenerated review SDK directly.
  review-moderation-service-boundary Non-admin features must not import features/admin/services/review-moderation.service.
  comment-moderation-no-sdk-leak features/admin/comment-moderation/** must not import the regenerated comment SDK directly.
  comment-moderation-service-boundary Non-admin features must not import features/admin/services/comment-moderation.service.
  tournament-admin-no-sdk-leak features/admin/tournament-admin/** must not import the regenerated tournament SDK directly.
  tournament-admin-service-boundary Non-admin features must not import features/admin/services/tournament-admin.service.
  achievement-admin-no-sdk-leak features/admin/achievement-admin/** must not import the regenerated achievement SDK directly.
  achievement-admin-service-boundary Non-admin features must not import features/admin/services/achievement-admin.service.

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
      `[phase7:lint-invariants] unknown flag: ${a}\n`,
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

async function walkFiles(root, filter = () => true) {
  const out = [];
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

// ─── Check 1: admin-no-axios-or-fetch ────────────────────────────────────

async function checkAdminNoAxiosOrFetch() {
  const violations = [];
  try {
    const files = await walkFiles(
      ADMIN_DIR,
      (f) =>
        (f.endsWith(".ts") ||
          f.endsWith(".tsx") ||
          f.endsWith(".mts") ||
          f.endsWith(".cts")) &&
        !f.includes(`${path.sep}services${path.sep}`) &&
        !f.includes("__tests__") &&
        !ADMIN_NO_FETCH_EXCEPTIONS.some((needle) => f.endsWith(needle)),
    );
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i];
        const trimmed = raw.trimStart();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("<!--")
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

// ─── Check 2: admin-permission-map-exhaustive ─────────────────────────────

function checkAdminPermissionMapExhaustive() {
  const violations = [];

  let permissionsSrc = "";
  let roleSrc = "";
  try {
    permissionsSrc = readFileSync(ADMIN_PERMISSIONS_PATH, "utf-8");
    roleSrc = readFileSync(ADMIN_ROLE_PATH, "utf-8");
  } catch (err) {
    return [
      {
        issue: "could not read permissions.ts or useAdminRole.ts",
        detail: String(err),
      },
    ];
  }

  // Every AdminPermission is a key in the PERMISSIONS constant.
  // (e.g. `tag_create: 'tag_create'`).
  const documentedPermissions = new Set();
  for (const m of permissionsSrc.matchAll(/^\s*([a-z_]+):\s*'[a-z_]+'/gm)) {
    documentedPermissions.add(m[1]);
  }

  // Every role slug in ROLE_PERMISSION_MAP enumerates permissions.
  // The map supports two forms:
  //   - `slug: ADMIN_PERMISSIONS` (e.g. admin)
  //   - `slug: [ 'perm1', 'perm2', ... ]` (single-line array)
  //   - `slug: [\n  'perm1',\n  'perm2',\n]` (multi-line array)
  // We parse all three forms.
  const roleGrantCoverage = new Map();
  const allMatches = [...roleSrc.matchAll(
    /^\s*([a-zA-Z_-]+):\s*((?:ADMIN_PERMISSIONS|\[([\s\S]*?)\]))[,]?/gm,
  )];
  for (const m of allMatches) {
    const slug = m[1];
    const raw = m[2];
    const inner = m[3];
    const collected = [];
    if (raw.startsWith("ADMIN_PERMISSIONS")) {
      for (const p of documentedPermissions) collected.push(p);
    } else if (inner !== undefined) {
      const lines = inner.split("\n");
      for (const line of lines) {
        const entry = line.match(/^\s*'([a-z_]+)',?/);
        if (entry) collected.push(entry[1]);
      }
    }
    roleGrantCoverage.set(slug, collected);
  }

  for (const perm of documentedPermissions) {
    const granted = Array.from(roleGrantCoverage.values()).some((set) =>
      set.includes(perm),
    );
    if (!granted) {
      violations.push({ issue: "ungranted_permission", permission: perm });
    }
  }
  return violations;
}

// ─── Check 3: irreversible-confirm-invariants-hold ────────────────────────

function checkIrreversibleConfirmInvariantsHold() {
  const violations = [];
  let src = "";
  try {
    src = readFileSync(ADMIN_CAPABILITIES_PATH, "utf-8");
  } catch (err) {
    return [{ issue: "could not read admin-capabilities.ts", detail: String(err) }];
  }

  // Extract confirm strings from IRREVERSIBLE_OPERATIONS table rows.
  // Each entry looks like:
  //   { operation: '...', confirmString: '...', backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED' },
  const entries = [];
  for (const m of src.matchAll(
    /\{\s*operation:\s*'([^']+)',\s*confirmString:\s*'([^']+)',\s*backendCode:.*?\},?/gs,
  )) {
    entries.push({ operation: m[1], confirmString: m[2] });
  }

  const MIN_LENGTH = 8;

  function passes(label, s) {
    if (label === "minLength") return s.length >= MIN_LENGTH;
    if (label === "caseSensitive") return s === s.toUpperCase();
    if (label === "whitespaceSensitive") return /\s/.test(s);
    if (label === "nonTrivial")
      return /[A-Z]/.test(s) && s.trim().length >= MIN_LENGTH;
    return false;
  }

  for (const entry of entries) {
    for (const check of ["minLength", "caseSensitive", "whitespaceSensitive", "nonTrivial"]) {
      if (!passes(check, entry.confirmString)) {
        violations.push({
          issue: "broken_invariant",
          operation: entry.operation,
          confirmString: entry.confirmString,
          failingCheck: check,
        });
      }
    }
  }

  return violations;
}

// ─── Check 4: irreversible-confirm-unique ─────────────────────────────────

function checkIrreversibleConfirmUnique() {
  const violations = [];
  let src = "";
  try {
    src = readFileSync(ADMIN_CAPABILITIES_PATH, "utf-8");
  } catch (err) {
    return [{ issue: "could not read admin-capabilities.ts", detail: String(err) }];
  }

  const byString = new Map();
  for (const m of src.matchAll(
    /\{\s*operation:\s*'([^']+)',\s*confirmString:\s*'([^']+)',\s*backendCode:.*?\},?/gs,
  )) {
    const operation = m[1];
    const confirmString = m[2];
    const list = byString.get(confirmString) ?? [];
    list.push(operation);
    byString.set(confirmString, list);
  }

  for (const [confirmString, ops] of byString) {
    if (ops.length > 1) {
      violations.push({
        issue: "duplicate_confirm_string",
        confirmString,
        operations: ops,
      });
    }
  }

  return violations;
}

// ─── Check 5: admin-error-codes-have-copy ─────────────────────────────────

function checkAdminErrorCodesHaveCopy() {
  const violations = [];
  let src = "";
  try {
    src = readFileSync(ERROR_CODES_PATH, "utf-8");
  } catch (err) {
    return [{ issue: "could not read error-codes.ts", detail: String(err) }];
  }

  for (const code of ADMIN_DOCUMENTED_ERROR_CODES) {
    // Check the union entry exists in ErrorCode.
    const unionRe = new RegExp(`\\|\\s*'${code}'`);
    if (!unionRe.test(src)) {
      violations.push({ issue: "missing_in_union", code });
      continue;
    }
    // Check the priority copy entry exists in the priority copy block.
    const copyRe = new RegExp(`\\b${code}\\s*:\\s*\\{`);
    if (!copyRe.test(src)) {
      violations.push({ issue: "missing_in_priority_copy", code });
    }
  }

  return violations;
}

// ─── Check 6: admin-feature-flags-have-subflags ───────────────────────────

function checkAdminFeatureFlagsHaveSubflags() {
  const violations = [];
  let src = "";
  try {
    src = readFileSync(FEATURE_FLAGS_PATH, "utf-8");
  } catch (err) {
    return [{ issue: "could not read feature-flags.ts", detail: String(err) }];
  }

  for (const flag of ADMIN_FLAG_NAMES) {
    const re = new RegExp(`['"]${flag}['"]`);
    if (!re.test(src)) {
      violations.push({ issue: "missing_flag", flag });
    }
  }

  // Sub-flags must reference `admin_live` in their JSDoc. The doc
  // can sit several hundred characters before or after the property
  // declaration, so we anchor on the property name and check a 1500-char
  // window centred on the declaration.
  for (const sub of ADMIN_FLAG_NAMES.filter((f) => f !== "admin_live")) {
    const declRe = new RegExp(`\\b${sub}\\b`);
    const declMatch = declRe.exec(src);
    if (!declMatch) continue;
    const idx = declMatch.index;
    const window = src.slice(Math.max(0, idx - 1000), idx + 1500);
    if (!window.includes("admin_live")) {
      violations.push({
        issue: "sub_flag_missing_parent_reference",
        sub,
      });
    }
  }
  return violations;
}

// ─── Check 7: admin-import-boundary ───────────────────────────────────────

/**
 * Verify that `src/features/**` (non-admin) files never import from
 * `src/features/admin/services/**` or `src/features/admin/components/**`
 * (hooks and shared integration specs are exempt).
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/...`
 *   - `from '@/features/admin/components/...`
 *   - `from "@/features/admin/services/..."`
 *   - `from "@/features/admin/components/..."`
 *
 * Exemptions are checked by `ADMIN_IMPORT_EXCEPTIONS`.
 */
function checkAdminImportBoundary() {
  const violations = [];

  // Collect all non-admin feature source files.
  async function collectFeatureFiles() {
    const out = [];
    const stack = [FEATURE_DIR];
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
            e.name === ".git" ||
            e.name === "admin"
          )
            continue;
          stack.push(full);
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  // Collect all admin-route-group files (permitted consumers).
  async function collectAppAdminFiles() {
    const out = [];
    const stack = [APP_DIR];
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
          if (e.name === "node_modules" || e.name === ".next" || e.name === ".git")
            continue;
          stack.push(full);
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  function isAdminImport(line) {
    const t = line.trimStart();
    if (
      t.startsWith("//") ||
      t.startsWith("/*") ||
      t.startsWith("*") ||
      t.startsWith("<!--")
    )
      return false;
    const src = t.includes("from ") ? t : "";
    const match =
      /from\s+['"]@\/features\/admin\/(services|components)\//.exec(src);
    return match !== null;
  }

  return Promise.all([collectFeatureFiles(), collectAppAdminFiles()]).then(
    async ([featureFiles, appAdminFiles]) => {
      for (const file of [...featureFiles, ...appAdminFiles]) {
        const src = readFileSync(file, "utf-8");
        const lines = src.split("\n");
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          if (isAdminImport(line)) {
            // Admin-route-group files are permitted consumers.
            if (isAdminRouteGroup(file)) continue;
            // Exception paths (hooks, integration specs).
            if (isModuleException(file)) continue;
            violations.push({
              file: path.relative(CWD, file),
              line: i + 1,
              text: line.trim(),
            });
          }
        }
      }
      return violations;
    },
  );
}

// Helper: whether a file path is in the documented exception list
// (hooks barrel, cross-feature integration specs, etc.).
function isModuleException(filePath) {
  return ADMIN_IMPORT_EXCEPTIONS.some((needle) =>
    filePath.includes(needle),
  );
}

/**
 * True when the file path is under the admin route group
 * (`src/app/(protected)/admin/**`, or the legacy
 * `src/app/(protected)/admin/**` during the migration window).
 *
 * Hoisted to module scope so the seven SDK-boundary checks
 * (tag/category/review/comment/tournament/achievement + the
 * import-boundary check) all share one definition.
 */
function isAdminRouteGroup(filePath) {
  return (
    filePath.includes(
      `${path.sep}app${path.sep}(protected)${path.sep}admin${path.sep}`,
    ) || filePath.includes(`${path.sep}app${path.sep}admin${path.sep}`)
  );
}

/**
 * Tag-admin files (`features/admin/tag-admin/**`) must NOT import
 * the legacy `@/features/tags/api/tags-admin` module, which is the
 * pre-Epic-7.3 admin API surface. Tag-admin code reaches the SDK
 * exclusively via `features/admin/services/tag-admin.service.ts`.
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/tags/api/tags-admin'`
 *   - `from "@/features/tags/api/tags-admin"`
 *
 * The legacy module path is documented as deprecated at the JSDoc
 * top of `features/tags/api/tags-admin.ts`.
 */
async function checkTagAdminNoLegacyImports() {
  const violations = [];
  let files = [];
  try {
    files = await walkFiles(
      TAG_ADMIN_DIR,
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes("__tests__"),
    );
  } catch {
    // Directory doesn't exist yet — skip silently.
    return [];
  }
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/tags\/api\/tags-admin['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/tags/api/tags-admin'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 9: tag-admin-sdk-boundary (TKT-7.3.H3) ─────────────────────────

/**
 * Outside the `features/admin/tag-admin/**` folder and the
 * `features/admin/services/**` folder, only the admin route group
 * (`src/app/(protected)/admin/**`) and the admin feature folder
 * (`src/features/admin/**`) may import the tag admin SDK service
 * (`@/features/admin/services/tag-admin.service`).
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/tag-admin.service'`
 *   - `from "@/features/admin/services/tag-admin.service"`
 *
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt
 * (see `ADMIN_IMPORT_EXCEPTIONS`).
 */
async function checkTagAdminSdkBoundary() {
  const violations = [];

  // Collect all src files (no `node_modules` etc.).
  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/tag-admin.service.ts (the file itself)
    //   - features/admin/tag-admin/** (the tag-admin feature)
    //   - src/app/(protected)/admin/** (the admin route group)
    //   - features/admin/** (the admin feature folder broadly)
    if (file === TAG_ADMIN_SERVICE_PATH) continue;
    if (file.startsWith(TAG_ADMIN_DIR + path.sep)) continue;
    if (
      isAdminRouteGroup(file)
    ) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    // Cross-feature integration specs (existing exemption).
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/tag-admin\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/tag-admin.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 11: category-admin-sdk-boundary (TKT-7.4.H3) ────────────────────

/**
 * Outside the `features/admin/category-admin/**` folder and the
 * `features/admin/services/**` folder, only the admin route group
 * (`src/app/(protected)/admin/**`) and the admin feature folder
 * (`src/features/admin/**`) may import the category admin SDK
 * service (`@/features/admin/services/category-admin.service`).
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/category-admin.service'`
 *   - `from "@/features/admin/services/category-admin.service"`
 *
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt
 * (see `ADMIN_IMPORT_EXCEPTIONS`).
 */
async function checkCategoryAdminSdkBoundary() {
  const violations = [];

  // Collect all src files (no `node_modules` etc.).
  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/category-admin.service.ts (the file itself)
    //   - features/admin/category-admin/** (the category-admin feature)
    //   - src/app/(protected)/admin/** (the admin route group)
    //   - features/admin/** (the admin feature folder broadly)
    if (file === CATEGORY_ADMIN_SERVICE_PATH) continue;
    if (file.startsWith(CATEGORY_ADMIN_DIR + path.sep)) continue;
    if (
      isAdminRouteGroup(file)
    ) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    // Cross-feature integration specs (existing exemption).
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/category-admin\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/category-admin.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 12: review-moderation-no-sdk-leak (TKT-7.5.H3) ─────────────────

/**
 * Review-moderation files (`features/admin/review-moderation/**`)
 * must NOT import the regenerated review SDK directly. They must
 * reach the SDK exclusively through
 * `features/admin/services/review-moderation.service.ts`. Mirrors the
 * tag-admin and category-admin enforcement shape.
 *
 * Pattern scanned per source file line:
 *   - `from '@/lib/api/generated/reviews/reviews'`
 *   - `from "@/lib/api/generated/reviews/reviews"`
 *   - `from '@/lib/api/generated/reviews/...'`
 *   - `from "@/lib/api/generated/reviews/..."`
 */
async function checkReviewModerationNoSdkLeak() {
  const violations = [];
  let files = [];
  try {
    files = await walkFiles(
      REVIEW_MODERATION_DIR,
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes("__tests__"),
    );
  } catch {
    return [];
  }
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/lib\/api\/generated\/reviews(\/|\b)/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/lib/api/generated/reviews/...'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 13: review-moderation-service-boundary (TKT-7.5.H3) ───────────

/**
 * Outside `features/admin/review-moderation/**`, only the
 * `features/admin/services/**` folder, the admin route group
 * (`src/app/(protected)/admin/**`), and the admin feature folder
 * (`src/features/admin/**`) may import the review-moderation
 * service (`@/features/admin/services/review-moderation.service`).
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/review-moderation.service'`
 *   - `from "@/features/admin/services/review-moderation.service"`
 */
async function checkReviewModerationServiceBoundary() {
  const violations = [];

  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/review-moderation.service.ts (itself)
    //   - features/admin/review-moderation/** (the feature)
    //   - src/app/(protected)/admin/** (admin route group)
    //   - features/admin/** (admin feature folder broadly)
    if (file === REVIEW_MODERATION_SERVICE_PATH) continue;
    if (file.startsWith(REVIEW_MODERATION_DIR + path.sep)) continue;
    if (isAdminRouteGroup(file)) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/review-moderation\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/review-moderation.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 14: comment-moderation-no-sdk-leak (TKT-7.6.H3) ────────────────

/**
 * Comment-moderation files (`features/admin/comment-moderation/**`)
 * must NOT import the regenerated comment SDK directly. They must
 * reach the SDK exclusively through
 * `features/admin/services/comment-moderation.service.ts`. Mirrors the
 * review-moderation enforcement (check 12).
 *
 * Pattern scanned per source file line:
 *   - `from '@/lib/api/generated/comments/...'`
 *   - `from "@/lib/api/generated/comments/..."`
 */
async function checkCommentModerationNoSdkLeak() {
  const violations = [];
  let files = [];
  try {
    files = await walkFiles(
      COMMENT_MODERATION_DIR,
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes("__tests__"),
    );
  } catch {
    return [];
  }
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/lib\/api\/generated\/comments(\/|\b)/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/lib/api/generated/comments/...'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 15: comment-moderation-service-boundary (TKT-7.6.H3) ──────────

/**
 * Outside `features/admin/comment-moderation/**`, only the
 * `features/admin/services/**` folder, the admin route group
 * (`src/app/(protected)/admin/**`), and the admin feature folder
 * (`src/features/admin/**`) may import the comment-moderation
 * service (`@/features/admin/services/comment-moderation.service`).
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/comment-moderation.service'`
 *   - `from "@/features/admin/services/comment-moderation.service"`
 */
async function checkCommentModerationServiceBoundary() {
  const violations = [];

  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/comment-moderation.service.ts (itself)
    //   - features/admin/comment-moderation/** (the feature)
    //   - src/app/(protected)/admin/** (admin route group)
    //   - features/admin/** (admin feature folder broadly)
    if (file === COMMENT_MODERATION_SERVICE_PATH) continue;
    if (file.startsWith(COMMENT_MODERATION_DIR + path.sep)) continue;
    if (isAdminRouteGroup(file)) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/comment-moderation\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/comment-moderation.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 16: tournament-admin-no-sdk-leak (TKT-7.7.H3) ────────────────

/**
 * Tournament-admin files (`features/admin/tournament-admin/**`)
 * must NOT import the regenerated tournament SDK directly. They must
 * reach the SDK exclusively through
 * `features/admin/services/tournament-admin.service.ts`. Mirrors the
 * comment-moderation enforcement (check 15).
 *
 * Pattern scanned per source file line:
 *   - `from '@/lib/api/generated/tournaments/...'`
 *   - `from "@/lib/api/generated/tournaments/..."`
 */
async function checkTournamentAdminNoSdkLeak() {
  const violations = [];
  let files = [];
  try {
    files = await walkFiles(
      TOURNAMENT_ADMIN_DIR,
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes("__tests__"),
    );
  } catch {
    return [];
  }
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/lib\/api\/generated\/tournaments(\/|\b)/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/lib/api/generated/tournaments/...'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 17: tournament-admin-service-boundary (TKT-7.7.H3) ─────────

/**
 * Outside `features/admin/tournament-admin/**`, only the
 * `features/admin/services/**` folder, the admin route group
 * (`src/app/(protected)/admin/**`), and the admin feature folder
 * (`src/features/admin/**`) may import the tournament admin
 * service (`@/features/admin/services/tournament-admin.service`).
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/tournament-admin.service'`
 *   - `from "@/features/admin/services/tournament-admin.service"`
 */
async function checkTournamentAdminServiceBoundary() {
  const violations = [];

  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/tournament-admin.service.ts (itself)
    //   - features/admin/tournament-admin/** (the feature)
    //   - src/app/(protected)/admin/** (admin route group)
    //   - features/admin/** (admin feature folder broadly)
    if (file === TOURNAMENT_ADMIN_SERVICE_PATH) continue;
    if (file.startsWith(TOURNAMENT_ADMIN_DIR + path.sep)) continue;
    if (isAdminRouteGroup(file)) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/tournament-admin\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/tournament-admin.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 18: achievement-admin-no-sdk-leak (TKT-7.8.H3) ────────────────

/**
 * Achievement-admin files (`features/admin/achievement-admin/**`)
 * must NOT import the regenerated achievement SDK directly. They must
 * reach the SDK exclusively through
 * `features/admin/services/achievement-admin.service.ts`.
 *
 * Pattern scanned per source file line:
 *   - `from '@/lib/api/generated/achievements/...'`
 *   - `from "@/lib/api/generated/achievements/..."`
 */
async function checkAchievementAdminNoSdkLeak() {
  const violations = [];
  let files = [];
  try {
    files = await walkFiles(
      ACHIEVEMENT_ADMIN_DIR,
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes("__tests__"),
    );
  } catch {
    return [];
  }
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/lib\/api\/generated\/achievements(\/|\b)/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/lib/api/generated/achievements/...'",
        });
      }
    }
  }
  return violations;
}

// ─── Check 19: achievement-admin-service-boundary (TKT-7.8.H3) ──────────

/**
 * Outside `features/admin/achievement-admin/**`, only the
 * `features/admin/services/**` folder, the admin route group
 * (`src/app/(protected)/admin/**`), and the admin feature folder
 * (`src/features/admin/**`) may import the achievement admin
 * service (`@/features/admin/services/achievement-admin.service`).
 * Cross-feature integration specs under
 * `src/features/shared/__tests__/phase7-*.spec.tsx` remain exempt.
 *
 * Pattern scanned per source file line:
 *   - `from '@/features/admin/services/achievement-admin.service'`
 *   - `from "@/features/admin/services/achievement-admin.service"`
 */
async function checkAchievementAdminServiceBoundary() {
  const violations = [];

  async function collectAllSrcFiles() {
    const out = [];
    const stack = [path.resolve(CWD, "src")];
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
        } else if (
          (full.endsWith(".ts") || full.endsWith(".tsx")) &&
          !full.includes("__tests__")
        ) {
          out.push(full);
        }
      }
    }
    return out;
  }

  const files = await collectAllSrcFiles();
  for (const file of files) {
    // Permitted locations:
    //   - features/admin/services/achievement-admin.service.ts (itself)
    //   - features/admin/achievement-admin/** (the feature)
    //   - src/app/(protected)/admin/** (admin route group)
    //   - features/admin/** (admin feature folder broadly)
    if (file === ACHIEVEMENT_ADMIN_SERVICE_PATH) continue;
    if (file.startsWith(ACHIEVEMENT_ADMIN_DIR + path.sep)) continue;
    if (isAdminRouteGroup(file)) continue;
    if (file.startsWith(ADMIN_DIR + path.sep)) continue;
    if (isModuleException(file)) continue;

    const src = readFileSync(file, "utf-8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const trimmed = raw.trimStart();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("<!--")
      )
        continue;
      const m = /from\s+['"]@\/features\/admin\/services\/achievement-admin\.service['"]/.exec(raw);
      if (m !== null) {
        violations.push({
          file: path.relative(CWD, file),
          line: i + 1,
          text: raw.trim(),
          pattern: "from '@/features/admin/services/achievement-admin.service'",
        });
      }
    }
  }
  return violations;
}

// ─── Report helpers ─────────────────────────────────────────────────────

function reportTournamentAdminNoSdkLeak(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} tournament-admin-no-sdk-leak — no tournament-admin file imports the regenerated tournament SDK directly\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} tournament-admin-no-sdk-leak — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportTournamentAdminServiceBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} tournament-admin-service-boundary — no non-admin file imports features/admin/services/tournament-admin.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} tournament-admin-service-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden service import:")} ${DIM(v.file)}:${DIM(String(v.line))}\n    ${DIM(v.text)}\n`,
    );
  }
  return false;
}

function reportAchievementAdminNoSdkLeak(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} achievement-admin-no-sdk-leak — no achievement-admin file imports the regenerated achievement SDK directly\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} achievement-admin-no-sdk-leak — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportAchievementAdminServiceBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} achievement-admin-service-boundary — no non-admin file imports features/admin/services/achievement-admin.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} achievement-admin-service-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden service import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportAdminNoAxiosOrFetch(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} admin-no-axios-or-fetch — no axios/fetch in non-service files under features/admin/\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} admin-no-axios-or-fetch — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden pattern:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportAdminPermissionMapExhaustive(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} admin-permission-map-exhaustive — every AdminPermission is granted by some role\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} admin-permission-map-exhaustive — ${BOLD(String(violations.length))} ungranted permission(s)\n\n`,
  );
  for (const v of violations) {
    if (v.issue === "ungranted_permission") {
      process.stdout.write(
        `  ${RED("no role grants:")} ${BOLD(v.permission)}\n`,
      );
    } else {
      process.stdout.write(`  ${RED("script error:")} ${BOLD(v.issue)}\n`);
    }
  }
  return false;
}

function reportIrreversibleConfirmInvariantsHold(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} irreversible-confirm-invariants-hold — every irreversible operation satisfies all four invariants\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} irreversible-confirm-invariants-hold — ${BOLD(String(violations.length))} violation(s)\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("invariant failed:")} ${BOLD(v.failingCheck)}  ${DIM(v.operation)}  ${DIM("[" + v.confirmString + "]")}\n`,
    );
  }
  return false;
}

function reportIrreversibleConfirmUnique(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} irreversible-confirm-unique — every irreversible operation has a unique confirm string\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} irreversible-confirm-unique — ${BOLD(String(violations.length))} duplicate string(s)\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("duplicate:")} ${BOLD(v.confirmString)}  ${DIM(v.operations.join(", "))}\n`,
    );
  }
  return false;
}

function reportAdminErrorCodesHaveCopy(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} admin-error-codes-have-copy — every admin error code has matching priority copy\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} admin-error-codes-have-copy — ${BOLD(String(violations.length))} issue(s)\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(`  ${RED(v.issue)} ${BOLD(v.code)}\n`);
  }
  return false;
}

function reportAdminFeatureFlagsHaveSubflags(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} admin-feature-flags-have-subflags — all eight Phase 7 admin flags are present and sub-flags reference the parent\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} admin-feature-flags-have-subflags — ${BOLD(String(violations.length))} issue(s)\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(`  ${RED(v.issue)} ${BOLD(v.flag ?? v.sub)}\n`);
  }
  return false;
}

function reportAdminImportBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} admin-import-boundary — no non-admin features import from admin services or components\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} admin-import-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden admin import:")} ${DIM(v.file)}:${DIM(String(v.line))}\n    ${DIM(v.text)}\n`,
    );
  }
  return false;
}

function reportTagAdminNoLegacyImports(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} tag-admin-no-legacy-imports — no tag-admin file imports the legacy tags-admin api\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} tag-admin-no-legacy-imports — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden legacy import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportTagAdminSdkBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} tag-admin-sdk-boundary — no non-admin file imports features/admin/services/tag-admin.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} tag-admin-sdk-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportCategoryAdminSdkBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} category-admin-sdk-boundary — no non-admin file imports features/admin/services/category-admin.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} category-admin-sdk-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportReviewModerationNoSdkLeak(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} review-moderation-no-sdk-leak — no review-moderation file imports the regenerated review SDK directly\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} review-moderation-no-sdk-leak — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportReviewModerationServiceBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} review-moderation-service-boundary — no non-admin file imports features/admin/services/review-moderation.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} review-moderation-service-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden service import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportCommentModerationNoSdkLeak(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} comment-moderation-no-sdk-leak — no comment-moderation file imports the regenerated comment SDK directly\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} comment-moderation-no-sdk-leak — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden SDK import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

function reportCommentModerationServiceBoundary(violations) {
  if (violations.length === 0) {
    process.stdout.write(
      `${GREEN("✓")} comment-moderation-service-boundary — no non-admin file imports features/admin/services/comment-moderation.service\n`,
    );
    return true;
  }
  process.stdout.write(
    `${RED("✗")} comment-moderation-service-boundary — ${BOLD(String(violations.length))} violation(s) found\n\n`,
  );
  for (const v of violations) {
    process.stdout.write(
      `  ${RED("forbidden service import:")} ${BOLD(v.pattern)}  ${DIM(v.file)}:${DIM(String(v.line))}\n`,
    );
  }
  return false;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  let ok = true;

  const axiosViolations = await checkAdminNoAxiosOrFetch();
  if (!reportAdminNoAxiosOrFetch(axiosViolations)) ok = false;

  const permViolations = checkAdminPermissionMapExhaustive();
  if (!reportAdminPermissionMapExhaustive(permViolations)) ok = false;

  const irrViolations = checkIrreversibleConfirmInvariantsHold();
  if (!reportIrreversibleConfirmInvariantsHold(irrViolations)) ok = false;

  const uniqueViolations = checkIrreversibleConfirmUnique();
  if (!reportIrreversibleConfirmUnique(uniqueViolations)) ok = false;

  const copyViolations = checkAdminErrorCodesHaveCopy();
  if (!reportAdminErrorCodesHaveCopy(copyViolations)) ok = false;

  const flagViolations = checkAdminFeatureFlagsHaveSubflags();
  if (!reportAdminFeatureFlagsHaveSubflags(flagViolations)) ok = false;

  const importViolations = await checkAdminImportBoundary();
  if (!reportAdminImportBoundary(importViolations)) ok = false;

  const legacyImportViolations = await checkTagAdminNoLegacyImports();
  if (!reportTagAdminNoLegacyImports(legacyImportViolations)) ok = false;

  const tagAdminSdkViolations = await checkTagAdminSdkBoundary();
  if (!reportTagAdminSdkBoundary(tagAdminSdkViolations)) ok = false;

  const categoryLegacyViolations = await Promise.resolve([]);
  void categoryLegacyViolations;
  // Check 10 (category-admin-no-legacy-imports) is intentionally not
  // implemented: the public `categories` module is the canonical
  // read-side source for the admin list (see `EPIC_7_4_A1.md` §6) and
  // is consumed only via the documented hook path. The inverse
  // boundary — no non-admin file imports the admin category service
  // directly — is enforced by check 11 below.

  const categorySdkViolations = await checkCategoryAdminSdkBoundary();
  if (!reportCategoryAdminSdkBoundary(categorySdkViolations)) ok = false;

  const reviewModerationSdkLeakViolations = await checkReviewModerationNoSdkLeak();
  if (!reportReviewModerationNoSdkLeak(reviewModerationSdkLeakViolations)) ok = false;

  const reviewModerationServiceViolations = await checkReviewModerationServiceBoundary();
  if (!reportReviewModerationServiceBoundary(reviewModerationServiceViolations)) ok = false;

  const commentModerationSdkLeakViolations = await checkCommentModerationNoSdkLeak();
  if (!reportCommentModerationNoSdkLeak(commentModerationSdkLeakViolations)) ok = false;

  const commentModerationServiceViolations = await checkCommentModerationServiceBoundary();
  if (!reportCommentModerationServiceBoundary(commentModerationServiceViolations)) ok = false;

  const tournamentAdminSdkLeakViolations = await checkTournamentAdminNoSdkLeak();
  if (!reportTournamentAdminNoSdkLeak(tournamentAdminSdkLeakViolations)) ok = false;

  const tournamentAdminServiceViolations = await checkTournamentAdminServiceBoundary();
  if (!reportTournamentAdminServiceBoundary(tournamentAdminServiceViolations)) ok = false;

  const achievementAdminSdkLeakViolations = await checkAchievementAdminNoSdkLeak();
  if (!reportAchievementAdminNoSdkLeak(achievementAdminSdkLeakViolations)) ok = false;

  const achievementAdminServiceViolations = await checkAchievementAdminServiceBoundary();
  if (!reportAchievementAdminServiceBoundary(achievementAdminServiceViolations)) ok = false;

  if (ok) {
    process.stdout.write(
      `\n${GREEN("[phase7:lint-invariants] all checks passed")}\n`,
    );
    process.exit(0);
  } else {
    process.stdout.write(
      `\n${RED("[phase7:lint-invariants] check(s) failed — fix violations above")}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`[phase7:lint-invariants] fatal: ${err}\n`);
  process.exit(1);
});
