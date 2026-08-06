/**
 * `phase7_admin_sentry.ts` — Phase 7 admin Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 7.1 — Admin foundations.
 * Source ticket: TKT-7.1.F1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase7:admin` Sentry breadcrumb
 * category that every admin hook, service, and primitive uses to
 * emit breadcrumbs. The helpers in this file are the **only**
 * functions admin consumers use to emit breadcrumbs; the
 * `phase7-lint-invariants` script (`scripts/phase7-lint-invariants.mjs`)
 * asserts that no caller bypasses them via direct
 * `Sentry.addBreadcrumb` calls (TKT-7.1.B6).
 *
 * ## Why a separate file
 *
 * The Phase 6 helpers (`phase6_sentry.ts`, `phase6_6_2_sentry.ts`,
 * `phase6_6_3_sentry.ts`) emit `phase6:*` category breadcrumbs.
 * Phase 7 admin uses a distinct `phase7:admin` category so the
 * Sentry dashboard can filter the two epics independently. Keeping
 * the helper module separate makes the contract difference explicit
 * and lets the lint invariant grep for the helpers without
 * entangling the Phase 6 shapes.
 *
 * ## Payload contract
 *
 * The breadcrumb payload shape is locked by TKT-7.1.F1 AC #1:
 *
 * ```ts
 * {
 *   category: "phase7:admin",
 *   data: {
 *     action: string,
 *     route: string,
 *     targetType?: string,
 *     targetId?: string,
 *     status: 'started' | 'success' | 'failure' | 'skipped',
 *     durationMs: number,
 *     code?: string,
 *     requestId?: string,
 *     correlationId?: string,
 *     redactedPayload?: object,
 *     before?: unknown,
 *     after?: unknown,
 *     epic: '1.0.0',
 *   }
 * }
 * ```
 *
 * Optional fields are emitted only when the caller supplies them.
 * Redacted payloads are passed through the `redactFields` filter so
 * the breadcrumb never carries secrets, tokens, or PII.
 */

import * as Sentry from '@sentry/nextjs';

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Phase 7 admin telemetry. Distinct
 * from the Phase 6 categories (`phase6:*`) so the Sentry dashboard
 * can split the two epics' event volumes.
 */
export const EPIC_7_1_BREADCRUMB_CATEGORY = 'phase7:admin' as const;

/**
 * The Epic 7.1 version. Emitted as a breadcrumb data field so the
 * dashboard can split event volumes by Phase 7 release-train.
 */
export const EPIC_7_1_VERSION = '1.0.0' as const;

/**
 * Status enum used by every `addAdminBreadcrumb` call. The values
 * mirror the audit-lifecycle states used in `AuditActionShell`
 * (TKT-7.1.C3).
 */
export type AdminBreadcrumbStatus =
  | 'started'
  | 'success'
  | 'failure'
  | 'skipped';

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Dot-path expression identifying a field on a payload object that
 * should be replaced with `'[redacted]'` before the breadcrumb is
 * emitted. Example: `'before.password'`, `'after.token'`.
 */
export type RedactionPath = string;

export interface AddAdminBreadcrumbInput {
  /** Stable action identifier (e.g. `'tag.create'`, `'ranking.recalculate'`). */
  action: string;
  /** Stable route / SDK function identifier (e.g. `'tags.createTag'`). */
  route: string;
  /** Optional target type (e.g. `'tag'`, `'user'`, `'role'`). */
  targetType?: string;
  /**
   * Optional target id (e.g. the tag id, the user id). When supplied,
   * the value is emitted as-is. When the caller intends to redact
   * the id, omit it and pass it through `redactedPayload` instead.
   */
  targetId?: string;
  status: AdminBreadcrumbStatus;
  durationMs: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /** The `extensions.requestId` from a failure response. */
  requestId?: string;
  /** The `extensions.correlationId` from a failure response. */
  correlationId?: string;
  /** Optional pre-redaction payload snapshot (e.g. response data). */
  redactedPayload?: unknown;
  /**
   * Optional list of dot-paths into `redactedPayload` to redact.
   * Matched values are replaced with the literal string `'[redacted]'`.
   */
  redactFields?: readonly RedactionPath[];
}

export interface AddAdminAuditBreadcrumbInput {
  /** Stable action identifier. */
  action: string;
  /** Stable route / SDK function identifier. */
  route: string;
  /** Pre-mutation snapshot (already redacted by the caller if needed). */
  before: unknown;
  /** Post-mutation snapshot (already redacted by the caller if needed). */
  after: unknown;
  status: AdminBreadcrumbStatus;
  durationMs: number;
  requestId?: string;
  correlationId?: string;
}

// ─── Redaction ───────────────────────────────────────────────────────────

/**
 * Recursively replace values whose path matches one of `fields` with
 * the literal `'[redacted]'`. The match is exact on the joined
 * dot-path; both the joined path (`'a.b.c'`) and any segment name
 * (`'b'`) are checked so callers can express either form.
 */
export function redactValue(
  value: unknown,
  fields: readonly RedactionPath[],
): unknown {
  if (!fields.length) return value;
  if (value === null || typeof value !== 'object') return value;

  const seen = new WeakSet<object>();
  const visit = (node: unknown, pathSoFar: readonly string[]): unknown => {
    if (node === null || typeof node !== 'object') return node;
    if (seen.has(node as object)) return node;
    seen.add(node as object);

    if (Array.isArray(node)) {
      return node.map((item) => visit(item, pathSoFar));
    }

    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
      const next = [...pathSoFar, key];
      const isRedacted = fields.some(
        (field) => field === next.join('.') || field === key,
      );
      out[key] = isRedacted ? '[redacted]' : visit(v, next);
    }
    return out;
  };
  return visit(value, []);
}

// ─── Helpers ────────────────────────────────────────────────────────────

function pickOptional<T>(
  source: Record<string, T | undefined>,
  keys: readonly string[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Emit a `phase7:admin` breadcrumb with the documented payload
 * shape (TKT-7.1.F1 AC #1).
 *
 * @example
 *   addAdminBreadcrumb({
 *     action: 'tag.create',
 *     route: 'tags.createTag',
 *     status: 'success',
 *     durationMs: 142,
 *     targetType: 'tag',
 *     targetId: 'tag-1',
 *   });
 */
export function addAdminBreadcrumb(input: AddAdminBreadcrumbInput): void {
  const payload: Record<string, unknown> = {
    action: input.action,
    route: input.route,
    status: input.status,
    durationMs: input.durationMs,
    epic: EPIC_7_1_VERSION,
  };

  if (input.targetType !== undefined) payload.targetType = input.targetType;
  if (input.targetId !== undefined) payload.targetId = input.targetId;
  if (input.code !== undefined) payload.code = input.code;
  if (input.requestId !== undefined) payload.requestId = input.requestId;
  if (input.correlationId !== undefined)
    payload.correlationId = input.correlationId;

  if (input.redactedPayload !== undefined) {
    const redacted = redactValue(
      input.redactedPayload,
      input.redactFields ?? [],
    );
    payload.redactedPayload = redacted;
  }

  Sentry.addBreadcrumb({
    category: EPIC_7_1_BREADCRUMB_CATEGORY,
    data: payload as Record<string, string | number>,
  });
}

/**
 * Emit a `phase7:admin` breadcrumb that captures the before / after
 * audit-trail snapshots for a destructive admin mutation. Used by
 * `AuditActionShell` (TKT-7.1.C3) and the destructive services
 * (TKT-7.1.E1–E8).
 *
 * The `before` and `after` payloads are NOT auto-redacted; callers
 * are expected to pass already-redacted snapshots. This mirrors the
 * `AuditActionShell` contract (the shell applies redaction
 * internally before calling onBreadcrumb).
 *
 * @example
 *   addAdminAuditBreadcrumb({
 *     action: 'ranking.recalculate',
 *     route: 'rankings.recalculate',
 *     before: { periodId: 'p-1' },
 *     after: { jobId: 'job-1' },
 *     status: 'success',
 *     durationMs: 1200,
 *   });
 */
export function addAdminAuditBreadcrumb(
  input: AddAdminAuditBreadcrumbInput,
): void {
  const optional = pickOptional(input as unknown as Record<string, string | undefined>, [
    'requestId',
    'correlationId',
  ]);
  const payload: Record<string, unknown> = {
    action: input.action,
    route: input.route,
    before: input.before,
    after: input.after,
    status: input.status,
    durationMs: input.durationMs,
    epic: EPIC_7_1_VERSION,
    ...optional,
  };

  Sentry.addBreadcrumb({
    category: EPIC_7_1_BREADCRUMB_CATEGORY,
    data: payload as Record<string, string | number>,
  });
}

// ─── Per-area variants (TKT-7.1.F2) ───────────────────────────────────────
//
// These are thin wrappers that pin the `action` / `route` / `targetType`
// strings for each documented admin area. They reduce the chance of a
// caller passing a typo and keep the dashboard's per-area split stable.

/** Tag admin breadcrumb helper. `action` examples: `tag.create`, `tag.delete`. */
export function addTagAdminBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'tag' });
}

/** Category admin breadcrumb helper. `action` examples: `category.update`. */
export function addCategoryAdminBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'category' });
}

/** Review moderation breadcrumb helper. `action` examples: `review.report.resolve`. */
export function addReviewModerationBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'review-report' });
}

/** Comment moderation breadcrumb helper. `action` examples: `comment.hide`. */
export function addCommentModerationBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'comment' });
}

/** Ranking admin breadcrumb helper. `action` examples: `ranking.recalculate`. */
export function addRankingAdminBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'ranking' });
}

/** Achievement admin breadcrumb helper. `action` examples: `achievement.revokeBadge`. */
export function addAchievementAdminBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'achievement' });
}

/** Tournament admin breadcrumb helper. `action` examples: `tournament.delete`. */
export function addTournamentAdminBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'tournament' });
}

/** Role-grant breadcrumb helper. `action` examples: `role.grant`, `role.revoke`. */
export function addRoleGrantBreadcrumb(
  input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
  addAdminBreadcrumb({ ...input, targetType: 'role' });
}
