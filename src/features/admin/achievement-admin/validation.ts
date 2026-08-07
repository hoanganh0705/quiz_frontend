/**
 * `features/admin/achievement-admin/validation.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.B4.
 *
 * ## What this module owns
 *
 * Pure validation helpers for achievement admin inputs. This module never
 * makes server calls; it operates on values already in memory.
 *
 * ## UUID validation
 *
 * Both `userId` and `badgeId` are required to be valid UUIDv4 strings,
 * matching the backend `IsUUID('4')` constraint. The helpers below accept
 * any non-empty string and validate the UUIDv4 regex.
 *
 * ## Self-revoke gate
 *
 * Admins cannot revoke their own badges. The `isSelfRevokeAttempt` helper
 * detects when the target user id matches the calling admin's id, so the
 * UI can hide the **Revoke** affordance and the service can surface
 * `SELF_ACTION_FORBIDDEN` if the backend rejects.
 *
 * The check is a UX-level gate — the service layer independently enforces
 * the same invariant with `SELF_ACTION_FORBIDDEN` (confirmed by
 * `achievement-admin.service.ts` lines 64–67).
 */

import { z } from 'zod';

/**
 * UUIDv4 regex — mirrors the backend `IsUUID('4')` constraint.
 *
 * Derived from RFC 4122 §4.1.7. The version nibble (position 14) is '4'
 * and the variant bits (positions 17-19) are '8', '9', 'a', or 'b'.
 */
export const UUIDV4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── User ID validation ────────────────────────────────────────────────────

/**
 * Validates a user id string.
 *
 * @param id - the candidate string
 * @returns success or failure with a reason
 */
export function validateUserId(
  id: unknown,
): { ok: true; value: string } | { ok: false; reason: 'not-a-string' | 'invalid-uuid' } {
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, reason: 'not-a-string' };
  }
  if (!UUIDV4_REGEX.test(id)) {
    return { ok: false, reason: 'invalid-uuid' };
  }
  return { ok: true, value: id };
}

// ─── Badge ID validation ──────────────────────────────────────────────────

/**
 * Validates a badge id string.
 *
 * @param id - the candidate string
 * @returns success or failure with a reason
 */
export function validateBadgeId(
  id: unknown,
): { ok: true; value: string } | { ok: false; reason: 'not-a-string' | 'invalid-uuid' } {
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, reason: 'not-a-string' };
  }
  if (!UUIDV4_REGEX.test(id)) {
    return { ok: false, reason: 'invalid-uuid' };
  }
  return { ok: true, value: id };
}

// ─── Self-revoke gate ─────────────────────────────────────────────────────

/**
 * Detects a self-revoke attempt.
 *
 * Returns `true` when the target user id equals the calling admin's id.
 * The UI hides the **Revoke** affordance when this is `true`.
 * The service independently surfaces `SELF_ACTION_FORBIDDEN`.
 *
 * @param targetUserId - the user whose badge is being revoked
 * @param currentUserId - the calling admin's id
 * @returns `true` when the target is the current admin
 */
export function isSelfRevokeAttempt(
  targetUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!targetUserId || !currentUserId) {
    return false;
  }
  return targetUserId === currentUserId;
}

// ─── Zod schema re-exports (for future form library integration) ──────────

/** Zod schema for a UUIDv4 string. Use with `z.string()` pipelines. */
export const zodUuidV4 = z.string().regex(UUIDV4_REGEX, 'Must be a valid UUIDv4');
