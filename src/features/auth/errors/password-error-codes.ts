/**
 * Password-management error code constants and helpers.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T1.
 *
 * ## Purpose
 *
 * Centralizes the `AUTH_*` codes that the password-management endpoints
 * (`POST /auth/verify-password`, `POST /auth/change-password`) can
 * return. These are the codes the password-error mapper
 * (`password-error-mapper.ts`, 2.9.T2) dispatches on, and the hooks
 * (`useVerifyPassword`, `useChangePassword`, 2.9.T6/T7) read from.
 *
 * ## Why these are typed constants
 *
 * Without a typed registry, callers branch on raw strings
 * (`error.code === 'AUTH_INVALID_CURRENT_PASSWORD'`) which is fragile:
 * typos are silent, and adding a new code requires hunting every
 * call-site. With `AUTH_INVALID_CURRENT_PASSWORD`, TypeScript flags
 * typos at compile time and the union restricts exhaustive checks.
 *
 * ## Membership
 *
 * Each code mirrors an entry in `ErrorCode`
 * (`src/lib/api/error-codes.ts`). If the backend adds a new
 * password-management code, add it both there and here in the same
 * change.
 *
 * | Code                           | Surface                                          |
 * |--------------------------------|--------------------------------------------------|
 * | `AUTH_INVALID_CURRENT_PASSWORD`| `POST /auth/verify-password` (wrong), `POST /auth/change-password` (wrong current) |
 * | `AUTH_PASSWORD_REUSE`          | `POST /auth/change-password` (new matches history) |
 * | `AUTH_INVALID_TOKEN`           | Any auth endpoint with a stale access token     |
 * | `AUTH_RESOURCE_CONFLICT`       | `409` password-management conflicts (e.g. OAuth-only account) |
 * | `GLOBAL_VALIDATION_FAILED`     | `class-validator` rejection on the new password |
 *
 * ## Recovery codes
 *
 * `PASSWORD_RECOVERYABLE_STATUSES` covers the retryable HTTP statuses
 * (network, 5xx, 429) the password mapper uses to drive its
 * `'retryable'` classification. The names are intentionally
 * status-based — not code-based — because the password endpoints
 * share the same retry rules as every other authenticated endpoint.
 *
 * ## Usage
 *
 * ```typescript
 * import { isInvalidCurrentPasswordError } from './password-error-codes';
 *
 * if (isInvalidCurrentPasswordError(error.code)) {
 *   // Field-level error on the current-password field; clear that field.
 * }
 * ```
 */

// The canonical literals. Re-exported under stable names so consumers
// import from this module, not from `@/lib/api/error-codes` (which
// only exposes the type, not the value).
//
// P2-29 cleanup: each literal now carries `as const satisfies
// ErrorCode` so the global registry tracks the membership at compile
// time. The `PasswordErrorCode` union is derived via
// `Extract<ErrorCode, …>` so it auto-tracks the registry.
import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD' as const satisfies ErrorCode;
export const AUTH_PASSWORD_REUSE = 'AUTH_PASSWORD_REUSE' as const satisfies ErrorCode;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const satisfies ErrorCode;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const satisfies ErrorCode;
export const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED' as const satisfies ErrorCode;

/**
 * Union of password-management error codes this module recognizes.
 *
 * P2-29 cleanup: derived from the global `ErrorCode` union via
 * `Extract<ErrorCode, …>` so the subset auto-tracks the registry.
 *
 * Exhaustive: every member must appear in the `PASSWORD_KNOWN_CODES`
 * const array below. The vi test suite (planned in 2.9.T19) verifies
 * the union and the array are in lockstep.
 */
export type PasswordErrorCode = Extract<
  ErrorCode,
  | typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_PASSWORD_REUSE
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
>;

/**
 * Array form of `PasswordErrorCode`. Useful for `Array.includes`
 * checks inside hooks that may receive an `unknown` `code` value.
 */
export const PASSWORD_KNOWN_CODES: ReadonlyArray<PasswordErrorCode> = Object.freeze([
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_PASSWORD_REUSE,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
]);

/**
 * HTTP statuses the password mapper treats as `'retryable'`.
 *
 *   - `0`              — network failure (no response received)
 *   - `429`            — rate limited (`@Throttle()` decorator)
 *   - `500..599`       — server errors
 *
 * Status-based rather than code-based because every password endpoint
 * emits 5xx/429 from the same global filter; the mapper does not need
 * a per-endpoint code list.
 */
export const PASSWORD_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
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
 * This is the field-level error code for the verify-password modal
 * and the change-password card. Call sites that need to render
 * "Current password is incorrect" should prefer this helper over a
 * brittle string comparison.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'AUTH_INVALID_CURRENT_PASSWORD'`
 *
 * @example
 * ```typescript
 * if (isInvalidCurrentPasswordError(apiError.code)) {
 *   showFieldError('currentPassword', 'Current password is incorrect');
 *   clearField('currentPassword');
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
 * `AUTH_PASSWORD_REUSE`.
 *
 * The backend returns this code on `POST /auth/change-password` when
 * the new password matches a recent value in the user's password
 * history. The mapper collapses this to a single `'reuse'` kind; the
 * UI surfaces a generic "Choose a password you haven't used before"
 * message — the backend code intentionally does NOT disclose which
 * previous password matched.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'AUTH_PASSWORD_REUSE'`
 *
 * @example
 * ```typescript
 * if (isPasswordReuseError(apiError.code)) {
 *   showFieldError('newPassword', 'Choose a password you haven\'t used before');
 * }
 * ```
 */
export function isPasswordReuseError(
  code: string,
): code is typeof AUTH_PASSWORD_REUSE {
  return code === AUTH_PASSWORD_REUSE;
}

/**
 * Type guard: returns true when the given `code` is one of the
 * known password-management codes (i.e. one of the codes the
 * password-error mapper can classify).
 *
 * Useful when an error arrives from a non-password endpoint but the
 * caller wants to know whether the password mapper's classification
 * rules apply. The `PasswordErrorCode` member is preserved via the
 * generic.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 */
export function isPasswordErrorCode(code: string): code is PasswordErrorCode {
  return (PASSWORD_KNOWN_CODES as readonly string[]).includes(code);
}

/**
 * Type guard: returns true when the given HTTP `status` is one of
 * the retryable statuses the password mapper folds into its
 * `'retryable'` kind. Pass `error.status` (or `0` for network
 * failures) directly.
 *
 * @param status - The HTTP status code to check
 */
export function isPasswordRecoverableStatus(status: number): boolean {
  return (PASSWORD_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
