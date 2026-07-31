/**
 * Google OAuth error mapper.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T2.
 *
 * ## What this file does
 *
 * Translates an `unknown` thrown by `auth.service.googleLogin` into a
 * UI-facing error kind:
 *
 *   `mapGoogleLoginError(err)` → `GoogleLoginErrorResult`
 *
 * The result's `kind` field drives the login page's error banner copy.
 *
 * ## Error kind semantics
 *
 *   `invalid_token`   — Google rejected the ID token (expired, revoked,
 *                        or malformed). Prompt a fresh Google attempt.
 *   `account_conflict` — A Google email collides with an existing
 *                        password account. Do NOT retry; surface conflict.
 *   `linking_required` — The Google account needs to be linked to an
 *                        existing password account first.
 *   `retryable`       — 429, 5xx, network failure. Show retry affordance.
 *
 * ## Pure function
 *
 * No `Date.now`, no `Math.random`, no network, no `console`.
 * The unit suite (TKT-2.6.T19) exercises every documented branch.
 */

import { asApiErrorShape } from './auth-shapes';
import {
  AUTH_OAUTH_INVALID_TOKEN,
  AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS,
  AUTH_OAUTH_LINKING_REQUIRED,
} from './oauth-error-codes';

/**
 * UI-facing error kinds for the Google login flow.
 */
export type GoogleLoginErrorKind =
  | 'invalid_token'
  | 'account_conflict'
  | 'linking_required'
  | 'retryable';

export interface GoogleLoginErrorResult {
  kind: GoogleLoginErrorKind;
}

/**
 * Translate an `unknown` thrown by `auth.service.googleLogin` into a
 * UI-facing kind.
 *
 * Dispatch order:
 *
 *   1. `AUTH_OAUTH_INVALID_TOKEN` → `'invalid_token'`
 *   2. `AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS` → `'account_conflict'`
 *   3. `AUTH_OAUTH_LINKING_REQUIRED` → `'linking_required'`
 *   4. `429` → `'retryable'` (throttled; user can try again)
 *   5. `5xx` or network failure (`status === 0`) → `'retryable'`
 *   6. Anything else → `'retryable'`
 *
 * Note: OAuth 401 responses that are NOT `AUTH_OAUTH_*` codes fall
 * through to `'retryable'`. The `/auth/oauth/google` endpoint is
 * excluded from the 401-refresh path in `custom-instance.ts`, so
 * these should not reach here. If they do, they are treated as
 * retryable server errors.
 */
export function mapGoogleLoginError(err: unknown): GoogleLoginErrorResult {
  const shape = asApiErrorShape(err);

  if (!shape) {
    return { kind: 'retryable' };
  }

  // Specific OAuth codes first — these have distinct UX.
  if (shape.code === AUTH_OAUTH_INVALID_TOKEN) {
    return { kind: 'invalid_token' };
  }

  if (shape.code === AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS) {
    return { kind: 'account_conflict' };
  }

  if (shape.code === AUTH_OAUTH_LINKING_REQUIRED) {
    return { kind: 'linking_required' };
  }

  // 429 — throttled; retryable.
  if (shape.status === 429) {
    return { kind: 'retryable' };
  }

  // 5xx or network error — retryable.
  if (shape.isServerError || shape.status === 0) {
    return { kind: 'retryable' };
  }

  // Any other unexpected error — treat as retryable rather than
  // silently swallowing. The user should have an actionable path.
  return { kind: 'retryable' };
}
