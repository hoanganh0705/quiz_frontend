/**
 * Session-management error code constants and helpers.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T1.
 *
 * ## Purpose
 *
 * Centralizes the `AUTH_*` codes that the session-management endpoints
 * (`GET /auth/security/dashboard`, `GET /auth/sessions`,
 * `DELETE /auth/sessions/others`, `DELETE /auth/sessions/:sessionId`,
 * `POST /auth/logout-all`) can return. These are the codes the
 * session-error mapper (`session-error-mapper.ts`) dispatches on, and
 * the hooks (`useRevokeSession`, `useRevokeOtherSessions`,
 * `useLogoutAll`) read from.
 *
 * ## Why these are typed constants
 *
 * Without a typed registry, callers branch on raw strings
 * (`error.code === 'AUTH_SESSION_NOT_FOUND'`) which is fragile: typos
 * are silent, and adding a new code requires hunting every call-site.
 * With `AUTH_SESSION_NOT_FOUND`, TypeScript flags typos at compile
 * time and the union restricts exhaustive checks.
 *
 * ## Membership
 *
 * Each code mirrors an entry in `ErrorCode` (`src/lib/api/error-codes.ts`).
 * If the backend adds a new session-management code, add it both there
 * and here in the same change.
 *
 * | Code                       | Surface                                          |
 * |----------------------------|--------------------------------------------------|
 * | `AUTH_SESSION_NOT_FOUND`   | `DELETE /auth/sessions/:id` (revoked/unknown)    |
 * | `AUTH_INVALID_TOKEN`       | Any session endpoint with a stale access token   |
 * | `AUTH_RESOURCE_CONFLICT`   | `409` session-management conflicts               |
 *
 * ## Recovery codes
 *
 * `SESSION_RECOVERYABLE_STATUSES` covers the retryable HTTP statuses
 * (network, 5xx, 429) the session mapper uses to drive its
 * `'retryable'` classification. The names are intentionally
 * status-based — not code-based — because session endpoints share the
 * same retry rules as every other authenticated endpoint.
 *
 * ## Usage
 *
 * ```typescript
 * import { isSessionNotFoundError } from './session-error-codes';
 *
 * if (isSessionNotFoundError(error.code)) {
 *   // Treat as already-revoked: silent revalidation.
 * }
 * ```
 */

// The canonical literals. Re-exported under stable names so consumers
// import from this module, not from `@/lib/api/error-codes` (which
// only exposes the type, not the value).
//
// The drift check between these literals and the `ErrorCode` union
// lives in the planned 2.8.T24 vitest suite: a type assertion
// `const _t: ErrorCode = AUTH_SESSION_NOT_FOUND;` would fail if the
// literals ever diverge from the union.
export const AUTH_SESSION_NOT_FOUND = 'AUTH_SESSION_NOT_FOUND' as const;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const;

/**
 * Union of session-management error codes this module recognizes.
 *
 * Exhaustive: every member must appear in the `SESSION_KNOWN_CODES`
 * const array below. The vi test suite (planned in 2.8.T24) verifies
 * the union and the array are in lockstep.
 */
export type SessionErrorCode =
  | typeof AUTH_SESSION_NOT_FOUND
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT;

/**
 * Array form of `SessionErrorCode`. Useful for `Array.includes` checks
 * inside hooks that may receive an `unknown` `code` value.
 */
export const SESSION_KNOWN_CODES: ReadonlyArray<SessionErrorCode> = Object.freeze([
  AUTH_SESSION_NOT_FOUND,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
]);

/**
 * HTTP statuses the session mapper treats as `'retryable'`.
 *
 *   - `0`              — network failure (no response received)
 *   - `429`            — rate limited (`@Throttle()` decorator)
 *   - `500..599`       — server errors
 *
 * Status-based rather than code-based because every session endpoint
 * emits 5xx/429 from the same global filter; the mapper does not need
 * a per-endpoint code list.
 */
export const SESSION_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
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
 * Type guard: returns true when the given `code` is `AUTH_SESSION_NOT_FOUND`.
 *
 * This is the only session code that is semantically meaningful
 * outside of the mapper: it tells the caller "the session was already
 * revoked, treat as success-after-revalidation". Call sites that need
 * that semantic should prefer this helper over a brittle string
 * comparison.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 * @returns true when `code === 'AUTH_SESSION_NOT_FOUND'`
 *
 * @example
 * ```typescript
 * if (isSessionNotFoundError(apiError.code)) {
 *   await revalidateActiveSessions();
 *   // No user-facing error banner — the row is already gone.
 * }
 * ```
 */
export function isSessionNotFoundError(code: string): code is typeof AUTH_SESSION_NOT_FOUND {
  return code === AUTH_SESSION_NOT_FOUND;
}

/**
 * Type guard: returns true when the given `code` is one of the
 * known session-management codes (i.e. one of the codes the
 * session-error mapper can classify).
 *
 * Useful when an error arrives from a non-session endpoint but the
 * caller wants to know whether the session mapper's classification
 * rules apply. The `SessionErrorCode` member is preserved via the
 * generic.
 *
 * @param code - The RFC 7807 `extensions.code` to check
 */
export function isSessionErrorCode(code: string): code is SessionErrorCode {
  return (SESSION_KNOWN_CODES as readonly string[]).includes(code);
}

/**
 * Type guard: returns true when the given HTTP `status` is one of the
 * retryable statuses the session mapper folds into its `'retryable'`
 * kind. Pass `error.status` (or `0` for network failures) directly.
 *
 * @param status - The HTTP status code to check
 */
export function isSessionRecoverableStatus(status: number): boolean {
  return (SESSION_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
