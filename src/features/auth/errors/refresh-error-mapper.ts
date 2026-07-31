/**
 * Refresh error classifier — classifies refresh failures as terminal vs. retryable.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T2.
 *
 * ## Purpose
 *
 * Provides a pure function that classifies errors from the refresh endpoint
 * into two categories:
 *
 *   - **Terminal**: The session is permanently invalid. The client must
 *     clear all tokens/caches and force reauthentication. No retry is safe.
 *
 *   - **Retryable**: The failure is transient. A retry after a short
 *     cooldown may succeed. Examples: network error, server error (5xx),
 *     rate limit (429).
 *
 * ## Why this exists
 *
 * The refresh interceptor needs to decide what to do on failure.
 * This module centralizes that decision logic in a testable pure function:
 *
 *   ```typescript
 *   const classification = classifyRefreshError(error);
 *   if (classification.kind === 'terminal') {
 *     clearAllAuthCache();
 *     redirectToLogin();
 *   } else {
 *     startCooldown();
 *     // Maybe offer a manual retry
 *   }
 *   ```
 *
 * ## Error classification rules
 *
 * | Error condition | Classification | Rationale |
 * |-----------------|----------------|----------|
 * | `AUTH_TOKEN_REUSED` | terminal | Security violation — all sessions revoked |
 * | `AUTH_SESSION_CONTEXT_MISMATCH` | terminal | Session binding failed — must reauth |
 * | `AUTH_INVALID_REFRESH_TOKEN` | terminal | Token invalid/expired — must reauth |
 * | 401 with no body | terminal | No valid session — must reauth |
 * | Network error (status 0) | retryable | Transient — network may recover |
 * | 5xx server error | retryable | Transient — server may recover |
 * | 429 rate limited | retryable | Respect backoff — server requests it |
 * | Unknown error | retryable | Fail open to retryable |
 *
 * ## Pure function contract
 *
 * This module contains only pure functions. No `Date.now`, no `Math.random`,
 * no network, no `console`. The vitest suite in ticket 2.7.T20 exercises
 * every documented branch.
 */

import { isRefreshTerminalError } from './refresh-error-codes';

/**
 * Result of classifying a refresh error.
 */
export type RefreshErrorClassification =
  | { kind: 'terminal'; reason: TerminalReason }
  | { kind: 'retryable'; reason: RetryableReason };

/**
 * Reason codes for terminal refresh failures.
 * Used for logging and analytics (not user-facing).
 */
export type TerminalReason =
  | 'token_reused'
  | 'session_context_mismatch'
  | 'invalid_refresh_token'
  | 'no_refresh_token';

/**
 * Reason codes for retryable refresh failures.
 * Used for logging and analytics (not user-facing).
 */
export type RetryableReason =
  | 'network_error'
  | 'server_error'
  | 'rate_limited'
  | 'unknown';

/**
 * Input shape for the classifier.
 * Mirrors the small surface of `ApiError` that we need.
 */
export interface RefreshErrorInput {
  code: string;
  status: number;
}

/**
 * Classify a refresh error as terminal or retryable.
 *
 * @param error - The error from the refresh endpoint
 * @returns Classification indicating what action to take
 *
 * @example
 * ```typescript
 * try {
 *   await doRefresh();
 * } catch (err) {
 *   const classification = classifyRefreshError(err as ApiError);
 *   if (classification.kind === 'terminal') {
 *     handleTerminalFailure(classification.reason);
 *   } else {
 *     handleRetryableFailure(classification.reason);
 *   }
 * }
 * ```
 */
export function classifyRefreshError(error: RefreshErrorInput): RefreshErrorClassification {
  // Terminal: explicit security/validity codes
  if (isRefreshTerminalError(error.code)) {
    switch (error.code) {
      case 'AUTH_TOKEN_REUSED':
        return { kind: 'terminal', reason: 'token_reused' };
      case 'AUTH_SESSION_CONTEXT_MISMATCH':
        return { kind: 'terminal', reason: 'session_context_mismatch' };
      case 'AUTH_INVALID_REFRESH_TOKEN':
        return { kind: 'terminal', reason: 'invalid_refresh_token' };
    }
  }

  // Terminal: 401 with no recognized code (no valid session)
  if (error.status === 401) {
    return { kind: 'terminal', reason: 'no_refresh_token' };
  }

  // Retryable: network error (no response, status = 0)
  if (error.status === 0) {
    return { kind: 'retryable', reason: 'network_error' };
  }

  // Retryable: server error (5xx)
  if (error.status >= 500 && error.status < 600) {
    return { kind: 'retryable', reason: 'server_error' };
  }

  // Retryable: rate limited (429)
  if (error.status === 429) {
    return { kind: 'retryable', reason: 'rate_limited' };
  }

  // Fallback: unknown error — treat as retryable
  // This is a conservative choice: a true unknown terminal error would
  // show as a server error to the user anyway, and a retry might succeed.
  return { kind: 'retryable', reason: 'unknown' };
}

/**
 * Returns true if the classification is terminal.
 * Convenience helper for conditional logic.
 *
 * @param classification - The result of `classifyRefreshError`
 * @returns true if the classification is terminal
 */
export function isTerminalRefreshError(
  classification: RefreshErrorClassification,
): classification is Extract<RefreshErrorClassification, { kind: 'terminal' }> {
  return classification.kind === 'terminal';
}

/**
 * Returns true if the classification is retryable.
 * Convenience helper for conditional logic.
 *
 * @param classification - The result of `classifyRefreshError`
 * @returns true if the classification is retryable
 */
export function isRetryableRefreshError(
  classification: RefreshErrorClassification,
): classification is Extract<RefreshErrorClassification, { kind: 'retryable' }> {
  return classification.kind === 'retryable';
}
