/**
 * Session-management error classifier — classifies session errors into
 * UI-facing kinds (`already_revoked`, `current_revoked`, `auth_terminal`,
 * `conflict`, `retryable`).
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T2.
 *
 * ## Purpose
 *
 * Provides a pure function that the session-management hooks
 * (`useRevokeSession`, `useRevokeOtherSessions`, `useLogoutAll`)
 * dispatch on to decide:
 *
 *   - whether to surface a banner to the user,
 *   - whether to silently revalidate (for stale lists),
 *   - whether to run the finalization path (for current-session revoke).
 *
 * The mapper is **target-aware**: the same code (e.g.
 * `AUTH_SESSION_NOT_FOUND`) means "already revoked" when the caller
 * was revoking another session, and "current revoked" when the caller
 * was revoking the current session. Distinguishing the two is the
 * whole point of the function.
 *
 * ## Why this exists
 *
 * Inlining the dispatch at each call site duplicates the security
 * rules (current-session finalization must never run on a non-current
 * revoke; `409` must never run finalization; etc). Centralizing the
 * dispatch in a pure function lets a single unit suite
 * (planned for 2.8.T24) lock in every branch.
 *
 * ## Classification rules
 *
 * | Error condition                       | Classification   | Caller action |
 * |---------------------------------------|------------------|---------------|
 * | `AUTH_SESSION_NOT_FOUND` on `'other'` | `already_revoked`| Revalidate silently |
 * | `AUTH_SESSION_NOT_FOUND` on `'self'`  | `current_revoked`| Finalize + redirect |
 * | `AUTH_INVALID_TOKEN`                  | `auth_terminal`  | Refresh-cooldown policy |
 * | `AUTH_RESOURCE_CONFLICT`              | `conflict`       | Banner; keep current session |
 * | `429` / `5xx` / network (`status 0`)  | `retryable`      | Banner with retry |
 * | Unknown code                          | `retryable`      | Conservative; banner with retry |
 *
 * ## Pure function contract
 *
 * No `Date.now`, no `Math.random`, no network, no `console`. The
 * vitest suite (planned for 2.8.T24) depends on this contract.
 */

import {
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  AUTH_SESSION_NOT_FOUND,
  isSessionRecoverableStatus,
} from './session-error-codes';

/**
 * Which operation surfaced the error. Determines the interpretation
 * of `AUTH_SESSION_NOT_FOUND` (the only code with two meanings).
 */
export type SessionErrorTarget =
  /** Revoking the calling tab's own session. */
  | 'self'
  /** Revoking a single non-current session. */
  | 'other'
  /** Listing the active sessions (read). */
  | 'list'
  /** Revoking all other sessions. */
  | 'revoke-others'
  /** Fetching the security dashboard (read). */
  | 'dashboard'
  /** Logging out everywhere. */
  | 'logout-all';

/**
 * Result of classifying a session error.
 *
 * `kind` is the UI-facing kind; `code` and `status` are preserved for
 * logging and for hooks that want to attach a structured log entry.
 * `target` is preserved so `useSessionErrorKind` consumers can branch
 * without re-passing it.
 */
export type SessionErrorClassification =
  | {
      kind: 'already_revoked';
      code: typeof AUTH_SESSION_NOT_FOUND;
      status: number;
      target: SessionErrorTarget;
    }
  | {
      kind: 'current_revoked';
      code: typeof AUTH_SESSION_NOT_FOUND;
      status: number;
      target: 'self';
    }
  | {
      kind: 'auth_terminal';
      code: typeof AUTH_INVALID_TOKEN;
      status: number;
      target: SessionErrorTarget;
    }
  | {
      kind: 'conflict';
      code: typeof AUTH_RESOURCE_CONFLICT;
      status: number;
      target: SessionErrorTarget;
    }
  | {
      kind: 'retryable';
      code: string;
      status: number;
      target: SessionErrorTarget;
    };

/**
 * Input shape for the classifier.
 * Mirrors the small surface of `ApiError` that the dispatcher needs.
 *
 * Hooks build this from a real `ApiError` (or the synthetic shapes
 * used in unit tests) via `asApiErrorShape` from `auth-shapes.ts`.
 */
export interface SessionErrorInput {
  code: string;
  status: number;
  target: SessionErrorTarget;
}

/**
 * Classify a session-management error into a UI-facing kind.
 *
 * @param error - The error from a session-management endpoint
 * @returns Classification indicating what the hook should do
 *
 * @example
 * ```typescript
 * try {
 *   await revokeSession(sessionId, { isCurrentSession: target === 'self' });
 * } catch (err) {
 *   const c = mapSessionError({
 *     code: err.code,
 *     status: err.status,
 *     target: 'other',
 *   });
 *   if (c.kind === 'already_revoked') {
 *     await revalidateActiveSessions();
 *   } else if (c.kind === 'current_revoked') {
 *     await runFinalization();
 *   } else if (c.kind === 'conflict') {
 *     showBanner('Conflict');
 *   } else if (c.kind === 'auth_terminal') {
 *     // follow refresh/final-logout policy
 *   } else {
 *     showBanner('Retry');
 *   }
 * }
 * ```
 */
export function mapSessionError(
  error: SessionErrorInput,
): SessionErrorClassification {
  // AUTH_SESSION_NOT_FOUND has two meanings depending on what was
  // being revoked. Distinguish first because the other branches
  // (network, 5xx, 429, unknown) are the same regardless of target.
  if (error.code === AUTH_SESSION_NOT_FOUND) {
    if (error.target === 'self') {
      return {
        kind: 'current_revoked',
        code: AUTH_SESSION_NOT_FOUND,
        status: error.status,
        target: 'self',
      };
    }

    return {
      kind: 'already_revoked',
      code: AUTH_SESSION_NOT_FOUND,
      status: error.status,
      target: error.target,
    };
  }

  // AUTH_INVALID_TOKEN: terminal — the shared refresh/final-logout
  // policy owns this path; the session mapper just marks it.
  if (error.code === AUTH_INVALID_TOKEN) {
    return {
      kind: 'auth_terminal',
      code: AUTH_INVALID_TOKEN,
      status: error.status,
      target: error.target,
    };
  }

  // 409 conflict — preserve current session, surface a banner.
  if (error.code === AUTH_RESOURCE_CONFLICT) {
    return {
      kind: 'conflict',
      code: AUTH_RESOURCE_CONFLICT,
      status: error.status,
      target: error.target,
    };
  }

  // Retryable: rate limit / server error / network — fail open to a
  // banner with retry. The status check covers 0/429/5xx uniformly;
  // the code itself is preserved for logging.
  if (isSessionRecoverableStatus(error.status)) {
    return {
      kind: 'retryable',
      code: error.code,
      status: error.status,
      target: error.target,
    };
  }

  // Final fallback: unknown error — treat as retryable.
  // This is intentionally permissive. A true unknown terminal error
  // would manifest as a 5xx (already covered above); bucketing the
  // remainder as `'retryable'` lets the user retry, which is the
  // desired behaviour for an authenticated session-management call.
  return {
    kind: 'retryable',
    code: error.code,
    status: error.status,
    target: error.target,
  };
}

/**
 * Returns true when the classification is `already_revoked`.
 * Convenience helper for conditional logic.
 */
export function isAlreadyRevoked(
  classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'already_revoked' }> {
  return classification.kind === 'already_revoked';
}

/**
 * Returns true when the classification is `current_revoked`
 * (i.e. the caller revoked their own session via the list UI).
 * Convenience helper for the hook's finalize-on-current path.
 */
export function isCurrentRevoked(
  classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'current_revoked' }> {
  return classification.kind === 'current_revoked';
}

/**
 * Returns true when the classification is `auth_terminal`.
 * Convenience helper for the shared refresh/final-logout policy.
 */
export function isAuthTerminalSessionError(
  classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'auth_terminal' }> {
  return classification.kind === 'auth_terminal';
}

/**
 * Returns true when the classification is `retryable`.
 * Convenience helper for the banner + retry path.
 */
export function isSessionErrorRetryable(
  classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'retryable' }> {
  return classification.kind === 'retryable';
}

/**
 * Returns true when the classification is `conflict`.
 * Convenience helper for the conflict banner.
 */
export function isSessionConflict(
  classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'conflict' }> {
  return classification.kind === 'conflict';
}
