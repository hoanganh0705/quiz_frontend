/**
 * Account-deletion error code constants and helpers.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T2.
 *
 * ## Purpose
 *
 * Centralizes the `AUTH_*` codes that the account-deletion endpoint
 * (`DELETE /auth/account`) can return. These are the codes the
 * deletion-error mapper (`deletion-error-mapper.ts`, 2.10.T3) dispatches
 * on, and the deletion hook (`useDeleteAccount`, 2.10.T12) reads from.
 *
 * ## Why these are typed constants
 *
 * Without a typed registry, callers branch on raw strings
 * (`error.code === 'AUTH_DELETION_FAILED'`) which is fragile: typos
 * are silent, and adding a new code requires hunting every call-site.
 * With `AUTH_DELETION_FAILED`, TypeScript flags typos at compile time
 * and the union restricts exhaustive checks.
 *
 * ## Membership
 *
 * Each code mirrors an entry in `ErrorCode`
 * (`src/lib/api/error-codes.ts`). If the backend adds a new
 * deletion-management code, add it both there and here in the same
 * change.
 *
 * | Code                           | Surface                                                       |
 * |--------------------------------|---------------------------------------------------------------|
 * | `AUTH_INVALID_CURRENT_PASSWORD`| `DELETE /auth/account` (wrong current password)               |
 * | `AUTH_DELETION_FAILED`         | `DELETE /auth/account` (concurrent / already-deleted / generic conflict) |
 * | `AUTH_INVALID_TOKEN`           | `DELETE /auth/account` (stale access token)                   |
 * | `AUTH_RESOURCE_CONFLICT`       | `409` account-deletion conflicts (e.g. OAuth-only with linked data) |
 * | `GLOBAL_VALIDATION_FAILED`     | `class-validator` rejection on the password field             |
 * | `USER_NOT_FOUND`               | `DELETE /auth/account` (account no longer exists)             |
 *
 * ## Recovery codes
 *
 * `DELETION_RECOVERYABLE_STATUSES` covers the retryable HTTP statuses
 * (network, 5xx, 429) the deletion mapper uses to drive its
 * `'uncertain'` classification. The names are intentionally
 * status-based — not code-based — because the delete endpoint shares
 * the same retry rules as every other authenticated endpoint.
 *
 * ## Why `USER_NOT_FOUND` is included
 *
 * The epic's edge cases call out "concurrent deletion" — another tab
 * (or a backend cleanup job) deleted the account between the user
 * opening the modal and the request landing. The backend surfaces this
 * as `USER_NOT_FOUND` because the user row is gone. The mapper folds
 * this into the same `'not_found'` kind as `AUTH_DELETION_FAILED`
 * because both mean "the account no longer exists; we cannot retry
 * blindly".
 *
 * ## Usage
 *
 * ```typescript
 * import { isInvalidCurrentPasswordError } from './deletion-error-codes';
 *
 * if (isInvalidCurrentPasswordError(error.code)) {
 *   // Field-level error on the password field; clear it; keep intent confirmation.
 * }
 * ```
 */

export const AUTH_INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD' as const;
export const AUTH_DELETION_FAILED = 'AUTH_DELETION_FAILED' as const;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const;
export const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED' as const;
export const USER_NOT_FOUND = 'USER_NOT_FOUND' as const;

/**
 * Union of account-deletion error codes this module recognizes.
 *
 * Exhaustive: every member must appear in the `DELETION_KNOWN_CODES`
 * const array below. The vitest suite (planned in 2.10.T25) verifies
 * the union and the array are in lockstep.
 */
export type DeletionErrorCode =
  | typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_DELETION_FAILED
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
  | typeof USER_NOT_FOUND;

/**
 * Array form of `DeletionErrorCode`. Useful for `Array.includes`
 * checks inside hooks that may receive an `unknown` `code` value.
 */
export const DELETION_KNOWN_CODES: ReadonlyArray<DeletionErrorCode> = Object.freeze([
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_DELETION_FAILED,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
  USER_NOT_FOUND,
]);

/**
 * HTTP statuses the deletion mapper treats as `'uncertain'`.
 *
 *   - `0`              — network failure (no response received)
 *   - `429`            — rate limited (`@Throttle()` decorator)
 *   - `500..599`       — server errors
 *
 * Status-based rather than code-based because the delete endpoint
 * emits 5xx/429 from the same global filter; the mapper does not need
 * a per-endpoint code list.
 */
export const DELETION_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
  0,
  429,
  500,
  501,
  502,
  503,
  504,
  505,
  506,
  507,
  508,
  510,
  511,
]);

/**
 * Type guard: returns true when the given `code` is
 * `AUTH_INVALID_CURRENT_PASSWORD`.
 *
 * This is the field-level error code for the destructive deletion
 * modal. Call sites that need to render "Current password is
 * incorrect" should prefer this helper over a brittle string
 * comparison. The mapper's `'invalid_current'` branch preserves
 * intent confirmation so the user only re-enters the password.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'AUTH_INVALID_CURRENT_PASSWORD'`
 *
 * @example
 * ```typescript
 * if (isInvalidCurrentPasswordError(apiError.code)) {
 *   showFieldError('password', 'Current password is incorrect');
 *   clearField('password');
 *   // Intent confirmation stays — user keeps their typed intent.
 * }
 * ```
 */
export function isInvalidCurrentPasswordError(
  code: string,
): code is typeof AUTH_INVALID_CURRENT_PASSWORD {
  return code === AUTH_INVALID_CURRENT_PASSWORD;
}

/**
 * Type guard: returns true when the given `code` is
 * `AUTH_DELETION_FAILED`.
 *
 * The backend returns this code on `DELETE /auth/account` when the
 * deletion cannot proceed (concurrent modification, stale snapshot,
 * deletion-in-progress on another tab). The mapper folds this into
 * `'conflict'` so the UI does NOT claim success and forces an
 * account-state revalidation before allowing a retry.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'AUTH_DELETION_FAILED'`
 *
 * @example
 * ```typescript
 * if (isDeletionFailedError(apiError.code)) {
 *   // Require revalidation; do not let the user blindly re-submit.
 *   await revalidateAccountExists();
 * }
 * ```
 */
export function isDeletionFailedError(
  code: string,
): code is typeof AUTH_DELETION_FAILED {
  return code === AUTH_DELETION_FAILED;
}

/**
 * Type guard: returns true when the given `code` is
 * `USER_NOT_FOUND`.
 *
 * On the deletion endpoint this is the "another tab already deleted
 * the account" branch: the row is gone, so the mapper routes to
 * `'not_found'` and the finalizer treats the deletion as already
 * committed (the local cleanup still runs to make the rest of the
 * browser honest about the state).
 *
 * Note: `USER_NOT_FOUND` is a generic user-module code. This helper
 * does NOT mean "the user object doesn't exist in any context"; the
 * mapper narrows the interpretation based on the endpoint.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'USER_NOT_FOUND'`
 */
export function isUserNotFoundError(code: string): code is typeof USER_NOT_FOUND {
  return code === USER_NOT_FOUND;
}

/**
 * Type guard: returns true when the given `code` is one of the
 * known deletion codes (i.e. one of the codes the deletion-error
 * mapper can classify).
 *
 * Useful when an error arrives from a non-deletion endpoint but the
 * caller wants to know whether the deletion mapper's classification
 * rules apply.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 */
export function isDeletionErrorCode(code: string): code is DeletionErrorCode {
  return (DELETION_KNOWN_CODES as readonly string[]).includes(code);
}

/**
 * Type guard: returns true when the given HTTP `status` is one of
 * the retryable / uncertain statuses the deletion mapper folds into
 * its `'uncertain'` kind. Pass `error.status` (or `0` for network
 * failures) directly.
 *
 * The mapper calls this `'uncertain'` rather than `'retryable'`
 * because a deletion request that timed out MUST NOT be retried
 * blindly — the backend may have committed deletion after the
 * network dropped the response, and the mapper requires the hook to
 * revalidate the account before another attempt.
 *
 * @param status - The HTTP status code to check
 */
export function isDeletionRecoverableStatus(status: number): boolean {
  return (DELETION_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
