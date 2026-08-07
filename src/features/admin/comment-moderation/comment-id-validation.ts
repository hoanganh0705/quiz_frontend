/**
 * `features/admin/comment-moderation/comment-id-validation.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.B3.
 *
 * ## Purpose
 *
 * Pure validation helpers for the comment-moderation queue. The
 * module owns:
 *
 *   1. The `COMMENT_ID_UUID_REGEX` constant — RFC 4122 v4 UUID, the
 *      documented shape of every backend `commentId` URL parameter
 *      and of every reported comment's `commentId` field.
 *   2. The `validateCommentId(id)` helper — returns a tagged result
 *      so callers can branch on `ok` without throwing.
 *   3. The `isCommentSelfModerationAttempt(commentAuthorId, currentUserId)`
 *      helper — detects when the current admin is also the author of
 *      the reported comment, so the queue can hide the resolve action
 *      and surface the documented "you cannot moderate your own
 *      comment" copy.
 *
 * The module is pure: it does not import React, does not call any
 * service, and does not touch the SDK. The self-moderation gate
 * relies on inputs already in memory (the comment row's `authorId`
 * field, fetched via the Phase 4 `useComment(commentId)` hook, and
 * the current user's id from `useAuth().currentUser.id`).
 *
 * ## Why a comment-specific helper instead of a re-export?
 *
 * Epic 7.5's `report-id-validation.ts` (TKT-7.5.B3) ships
 * `isSelfModerationAttempt(reportAuthorId, currentUserId)` parameterised
 * on the **report row's** `reportedUserId` (the user who was reported).
 * Comment reports carry the comment author's id on the **comment row**
 * (`commentDto.userId`), not on the report row (`reportDto.commentId`
 * is the *comment* id, not the author's id). The behavioural logic is
 * identical — string equality between the comment author and the
 * current admin — but the parameter shape is comment-specific. The
 * helper is therefore a fresh implementation rather than a re-export.
 *
 * ## Cross-batch invariants
 *
 * - `COMMENT_ID_UUID_REGEX` matches the backend `IsUUID('4')` decorator
 *   used on every comment / report id. The regex is case-insensitive
 *   (matches the lowercase and uppercase forms the backend serializes
 *   interchangeably).
 * - `validateCommentId` is total: every input — `null`, `undefined`,
 *   empty string, malformed string — returns a typed reason. The
 *   function never throws.
 * - `isCommentSelfModerationAttempt` is total: when either side is
 *   missing the function returns `false` (the gate does not flag
 *   missing authors as self-attempts).
 */

// ─── UUID regex ─────────────────────────────────────────────────────────────

const UUID_V4_REGEX_SOURCE =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

/**
 * RFC 4122 v4 UUID regex, case-insensitive. The backend uses
 * `IsUUID('4')` on every comment identifier and on every reported
 * comment's `commentId` field; this regex mirrors the same shape so
 * the client and the backend agree on what constitutes a valid id.
 *
 * The regex uses the standard `[1-5]` version nibble so it also
 * matches UUID v5 ids (which are byte-compatible with v4 in the
 * non-version parts). The `[89ab]` variant nibble is the
 * RFC 4122 §4.1.1 / §4.1.3 invariant.
 */
export const COMMENT_ID_UUID_REGEX: RegExp = new RegExp(
  UUID_V4_REGEX_SOURCE,
  'i',
);

// ─── Validate-comment-id ────────────────────────────────────────────────────

export type CommentIdValidationReason =
  /** The input was not a string (`null`, `undefined`, or another non-string value). */
  | 'not-a-string'
  /** The input was a string but did not match the UUID v4 regex. */
  | 'invalid-uuid';

export type CommentIdValidationResult =
  | { ok: true }
  | { ok: false; reason: CommentIdValidationReason };

/**
 * Validate a candidate comment id. The function is total and never
 * throws; the return is a discriminated union so callers can branch
 * on `ok` without try/catch.
 *
 * @example
 *   validateCommentId('00000000-0000-4000-8000-000000000000') // { ok: true }
 *   validateCommentId('not-a-uuid')                            // { ok: false, reason: 'invalid-uuid' }
 *   validateCommentId(null)                                    // { ok: false, reason: 'not-a-string' }
 */
export function validateCommentId(value: unknown): CommentIdValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'not-a-string' };
  }
  if (value.length === 0) {
    return { ok: false, reason: 'not-a-string' };
  }
  if (!COMMENT_ID_UUID_REGEX.test(value)) {
    return { ok: false, reason: 'invalid-uuid' };
  }
  return { ok: true };
}

// ─── Self-moderation gate ───────────────────────────────────────────────────

/**
 * Detect a self-moderation attempt on a comment.
 *
 * The function returns `true` when the current admin's id equals the
 * id of the user who authored the comment being moderated
 * (`CommentDto.userId` — read via the Phase 4 `useComment` hook, not
 * from the report row). Either side missing — `null` or `undefined` —
 * is treated as **not** a self-attempt; the gate is conservative and
 * only flags a positive match.
 *
 * Use the helper to:
 *   - hide the resolve action menu on the row.
 *   - short-circuit the mutation in the resolve hook.
 *   - render the documented "you cannot moderate your own comment"
 *     copy.
 *
 * @example
 *   isCommentSelfModerationAttempt('user-1', 'user-1') // true
 *   isCommentSelfModerationAttempt('user-1', 'user-2') // false
 *   isCommentSelfModerationAttempt(null, 'user-1')      // false (missing author)
 */
export function isCommentSelfModerationAttempt(
  commentAuthorId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (
    typeof commentAuthorId !== 'string' ||
    commentAuthorId.length === 0
  ) {
    return false;
  }
  if (
    typeof currentUserId !== 'string' ||
    currentUserId.length === 0
  ) {
    return false;
  }
  return commentAuthorId === currentUserId;
}