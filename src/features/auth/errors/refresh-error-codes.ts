/**
 * Refresh-specific error code constants and helpers.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T1.
 *
 * ## Purpose
 *
 * Centralizes the terminal refresh error codes that trigger forced
 * reauthentication. These codes indicate security-critical conditions
 * where the session must be invalidated immediately:
 *
 *   - `AUTH_TOKEN_REUSED` — Refresh token rotation was violated.
 *     The same token was used twice, indicating a potential token
 *     theft. All active sessions for this user are revoked.
 *
 *   - `AUTH_SESSION_CONTEXT_MISMATCH` — Strict session binding failed.
 *     The request's browser/device fingerprint no longer matches
 *     the session's original context.
 *
 *   - `AUTH_INVALID_REFRESH_TOKEN` — The refresh token is invalid,
 *     expired, or has been revoked for any reason. The session is
 *     terminated.
 *
 * ## Usage
 *
 * ```typescript
 * import { REFRESH_TERMINAL_ERROR_CODES, isRefreshTerminalError } from './refresh-error-codes';
 *
 * if (isRefreshTerminalError(error.code)) {
 *   // Force reauthentication
 * }
 * ```
 *
 * ## Why these codes are terminal
 *
 * Unlike recoverable errors (network timeout, 5xx, rate limit), these
 * codes indicate the server has explicitly invalidated the session.
 * The client cannot retry safely — any retry would expose stale or
 * invalid credentials.
 */

import type { ErrorCode } from '@/lib/api/error-codes';

/**
 * Error codes that indicate a terminal refresh failure.
 * When any of these codes is received, the client MUST clear all
 * cached tokens and force reauthentication.
 *
 * P2-29 cleanup: each literal now carries `as const satisfies
 * ErrorCode` so the global registry tracks the membership at
 * compile time. The runtime array is built from the typed literals
 * so the union is always in lockstep with the registry.
 */
export const AUTH_TOKEN_REUSED = 'AUTH_TOKEN_REUSED' as const satisfies ErrorCode;
export const AUTH_SESSION_CONTEXT_MISMATCH = 'AUTH_SESSION_CONTEXT_MISMATCH' as const satisfies ErrorCode;
export const AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN' as const satisfies ErrorCode;

export const REFRESH_TERMINAL_ERROR_CODES = [
  AUTH_TOKEN_REUSED,
  AUTH_SESSION_CONTEXT_MISMATCH,
  AUTH_INVALID_REFRESH_TOKEN,
] as const;

/**
 * Type-safe union of terminal refresh error codes. P2-29 cleanup:
 * derived from the global `ErrorCode` union via `Extract` so the
 * subset auto-tracks the registry.
 */
export type RefreshTerminalErrorCode = Extract<
  ErrorCode,
  | typeof AUTH_TOKEN_REUSED
  | typeof AUTH_SESSION_CONTEXT_MISMATCH
  | typeof AUTH_INVALID_REFRESH_TOKEN
>;

/**
 * Type guard: returns true if the given error code is a terminal
 * refresh error that requires forced reauthentication.
 *
 * @param code - The error code to check
 * @returns true if the code is a terminal refresh error
 *
 * @example
 * ```typescript
 * const isTerminal = isRefreshTerminalError('AUTH_TOKEN_REUSED');
 * // → true
 *
 * const isTerminal2 = isRefreshTerminalError('AUTH_INVALID_CREDENTIALS');
 * // → false
 * ```
 */
export function isRefreshTerminalError(
  code: string,
): code is RefreshTerminalErrorCode {
  return (REFRESH_TERMINAL_ERROR_CODES as readonly string[]).includes(code);
}
