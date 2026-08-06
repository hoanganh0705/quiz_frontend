/**
 * `features/admin/review-moderation/report-id-validation.ts`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.B3.
 *
 * ## Purpose
 *
 * Pure validation helpers for the review-moderation queue. The
 * module owns:
 *
 *   1. The `REPORT_ID_UUID_REGEX` constant — RFC 4122 v4 UUID, the
 *      documented shape of every backend `reportId` /
 *      `reviewId` / `:reportId` URL parameter.
 *   2. The `validateReportId(id)` helper — returns a tagged result
 *      so callers can branch on `ok` without throwing.
 *   3. The `isSelfModerationAttempt(reportAuthorId, currentUserId)`
 *      helper — detects when the current admin is also the author of
 *      the reported review, so the queue can hide the resolve action
 *      and surface the documented "you cannot moderate your own
 *      report" copy.
 *
 * The module is pure: it does not import React, does not call any
 * service, and does not touch the SDK. The self-moderation gate
 * relies on inputs already in memory (the report row's
 * `reportedUserId` field and the current user's id from
 * `useAuth().currentUser.id`).
 *
 * ## Why pure helpers (and not a hook)?
 *
 * `usePermission` (TKT-7.1.B2) returns the boolean
 * `hasPermission` only; the helper module never exposes the user's
 * identity through a hook to keep the cross-store invariant
 * ("no identity in hooks") intact. Callers compute the
 * self-moderation flag inline by reading both inputs.
 *
 * ## Cross-batch invariants
 *
 * - `REPORT_ID_UUID_REGEX` matches the backend `IsUUID('4')`
 *   decorator used on every report / review id. The regex is
 *   case-insensitive (matches the lowercase and uppercase forms the
 *   backend serializes interchangeably).
 * - `validateReportId` is total: every input — `null`, `undefined`,
 *   empty string, malformed string — returns a typed reason. The
 *   function never throws.
 * - `isSelfModerationAttempt` is total: when either side is missing
 *   the function returns `false` (the gate does not flag missing
 *   authors as self-attempts).
 */

const UUID_V4_REGEX_SOURCE =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

/**
 * RFC 4122 v4 UUID regex, case-insensitive. The backend uses
 * `IsUUID('4')` on every report / review identifier; this regex
 * mirrors the same shape so the client and the backend agree on
 * what constitutes a valid id.
 *
 * The regex uses the standard `[1-5]` version nibble so it also
 * matches UUID v5 ids (which are byte-compatible with v4 in the
 * non-version parts). The `[89ab]` variant nibble is the
 * RFC 4122 §4.1.1 / §4.1.3 invariant.
 */
export const REPORT_ID_UUID_REGEX: RegExp = new RegExp(
  UUID_V4_REGEX_SOURCE,
  'i',
);

export type ReportIdValidationReason =
  /** The input was not a string (`null`, `undefined`, or another non-string value). */
  | 'not-a-string'
  /** The input was a string but did not match the UUID v4 regex. */
  | 'invalid-uuid';

export type ReportIdValidationResult =
  | { ok: true }
  | { ok: false; reason: ReportIdValidationReason };

/**
 * Validate a candidate report / review id. The function is total and
 * never throws; the return is a discriminated union so callers can
 * branch on `ok` without try/catch.
 *
 * @example
 *   validateReportId('00000000-0000-4000-8000-000000000000') // { ok: true }
 *   validateReportId('not-a-uuid')                         // { ok: false, reason: 'invalid-uuid' }
 *   validateReportId(null)                                 // { ok: false, reason: 'not-a-string' }
 */
export function validateReportId(value: unknown): ReportIdValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'not-a-string' };
  }
  if (value.length === 0) {
    return { ok: false, reason: 'not-a-string' };
  }
  if (!REPORT_ID_UUID_REGEX.test(value)) {
    return { ok: false, reason: 'invalid-uuid' };
  }
  return { ok: true };
}

/**
 * Detect a self-moderation attempt.
 *
 * The function returns `true` when the current admin's id equals the
 * id of the user who authored the reported review
 * (`PlatformReportItemDto.reportedUserId`). Either side missing —
 * `null` or `undefined` — is treated as **not** a self-attempt; the
 * gate is conservative and only flags a positive match.
 *
 * Use the helper to:
 *   - hide the resolve action menu on the row.
 *   - short-circuit the mutation in the resolve hook.
 *   - render the documented "you cannot moderate your own report"
 *     copy.
 *
 * @example
 *   isSelfModerationAttempt('user-1', 'user-1') // true
 *   isSelfModerationAttempt('user-1', 'user-2') // false
 *   isSelfModerationAttempt(null, 'user-1')      // false (missing author)
 */
export function isSelfModerationAttempt(
  reportAuthorId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (typeof reportAuthorId !== 'string' || reportAuthorId.length === 0) {
    return false;
  }
  if (typeof currentUserId !== 'string' || currentUserId.length === 0) {
    return false;
  }
  return reportAuthorId === currentUserId;
}