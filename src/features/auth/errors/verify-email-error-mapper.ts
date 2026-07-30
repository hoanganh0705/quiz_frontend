/**
 * Verify-email and resend-verification error mapper.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.B2.
 *
 * ## What this file does
 *
 * Two pure mappers that translate an `unknown` thrown by the
 * `auth.service.verifyEmail` / `auth.service.resendVerificationEmail`
 * calls into a UI-facing kind:
 *
 *   `mapVerifyEmailError(err)` → `{ kind: 'acknowledgement' | 'invalid_link' | 'rate_limited' | 'server' }`
 *   `mapResendVerificationError(err)` → `{ kind: 'rate_limited' | 'server' }`
 *
 * The mappers NEVER return a string the backend shipped. Every
 * string the user sees is sourced from `verify-email-copy.ts` via
 * its keys. This file is the **runtime** anti-enumeration guard;
 * the copy file is the static one.
 *
 * ## Why "acknowledgement" instead of branching on success/error
 *
 * Epic 2.2's exit criteria say the verify page must render the same
 * neutral completion copy for every backend response — `200`, `400`
 * (invalid/expired token), `429`, `5xx`, and the client-side
 * malformed-token guard from TKT-2.2.C2. The mapper collapses every
 * reachable kind into `acknowledgement` for the verify page; the
 * page renders the same body via `verifyEmailCopy.verify.acknowledgement.body`.
 *
 * `invalid_link` is reserved for the client-side malformed-token
 * guard in TKT-2.2.C2 — when no backend call was even made. The
 * page renders the SAME body literal for that case too (the IDs
 * `verify.acknowledgement.body` and `verify.invalid.body` resolve to
 * identical strings; see TKT-2.2.B1).
 *
 * ## Pure functions
 *
 * No `Date.now`, `Math.random`, network, or console access. The
 * vitest suite in TKT-2.2.E3 exercises every documented branch.
 */

import {
  asApiErrorShape,
  containsEnumerationOracle,
} from './auth-shapes';

export {
  containsEnumerationOracle,
  ENUMERATION_PHRASES,
  asApiErrorShape,
} from './auth-shapes';

/**
 * Result kinds for the verify-email page state machine.
 *
 *   `pending`         — reserved for future optimistic UI; the mapper
 *                       never produces it today. Documented here so
 *                       a switch over the union is exhaustive.
 *   `acknowledgement` — every backend response (success or error);
 *                       the page renders the neutral body.
 *   `invalid_link`    — client-side malformed-token guard fired; the
 *                       page renders the same neutral body.
 *   `rate_limited`    — explicit `429` from the backend; the page
 *                       MAY overlay a retry-later copy in addition
 *                       to the neutral body.
 *   `server`          — network failure or 5xx; the page renders the
 *                       neutral body, optionally with a global
 *                       "try again" overlay.
 */
export type VerifyEmailErrorKind =
  | 'pending'
  | 'acknowledgement'
  | 'invalid_link'
  | 'rate_limited'
  | 'server';

export interface VerifyEmailErrorResult {
  kind: VerifyEmailErrorKind;
}

export function mapVerifyEmailError(err: unknown): VerifyEmailErrorResult {
  const shape = asApiErrorShape(err);
  if (!shape) {
    // Unknown error shape (network failure, thrown non-Error,
    // etc.) — collapse to `acknowledgement` so the page renders the
    // neutral body. The mapper never returns `'pending'`; that
    // branch is owned by the hook.
    return { kind: 'acknowledgement' };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  // Every other status — including 200, 201 (which the SDK never
  // throws), 400 (invalid/expired token), 403, 404, 5xx — collapses
  // to `acknowledgement`. The page renders the same neutral body.
  return { kind: 'acknowledgement' };
}

/**
 * Result kinds for the resend-verification page state machine.
 *
 *   `rate_limited` — explicit `429`. The page shows the cooldown
 *                    copy from `verify-email-copy.ts` and disables
 *                    the submit button.
 *   `server`       — every other failure (5xx, network, unknown
 *                    shape). The page shows the recoverable
 *                    failure copy and re-enables the button.
 *
 * Resend NEVER returns `'acknowledgement'`. The success path is
 * owned by the hook and lives in its `'cooldown' | 'idle'`
 * state machine; the mapper's job is only to translate thrown
 * errors. The vitest suite asserts no success-shaped kind here.
 */
export type ResendVerificationErrorKind = 'rate_limited' | 'server';

export interface ResendVerificationErrorResult {
  kind: ResendVerificationErrorKind;
}

export function mapResendVerificationError(
  err: unknown
): ResendVerificationErrorResult {
  const shape = asApiErrorShape(err);
  if (!shape) {
    return { kind: 'server' };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (shape.isServerError || shape.status === 0) {
    return { kind: 'server' };
  }

  // Any other status (400, 401, 403, 404, etc.) collapses to
  // `'server'`. We never surface the cause in copy, so the user
  // sees the same recoverable-failure message either way.
  return { kind: 'server' };
}

/**
 * Defensive helper for any future caller that wants to surface a
 * backend-supplied field-level message. Today no caller does — the
 * mappers above return kinds only — but the helper is exported so
 * TKT-2.2.E3 can assert the anti-enumeration contract at a single
 * seam rather than scatter `containsEnumerationOracle` calls.
 *
 * The helper is deliberately a thin wrapper around
 * `containsEnumerationOracle`. It is the only path through which a
 * backend message reaches a UI string.
 */
export function isEnumerationSafe(message: string): boolean {
  return !containsEnumerationOracle(message);
}