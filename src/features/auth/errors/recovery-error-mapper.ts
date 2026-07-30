/**
 * Forgot-password and reset-password error mapper.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.B2.
 *
 * ## What this file does
 *
 * Two pure mappers that translate an `unknown` thrown by
 * `auth.service.forgotPassword` / `auth.service.resetPassword` into
 * a UI-facing kind:
 *
 *   `mapForgotPasswordError(err)` → `{ kind: 'acknowledgement' | 'rate_limited' | 'server' }`
 *   `mapResetPasswordError(err)`  → `{ kind: 'success' | 'invalid_link' | 'validation' | 'rate_limited' | 'server' }`
 *
 * The mappers NEVER return a string the backend shipped. Every
 * string the user sees is sourced from `recovery-copy.ts` via its
 * keys. This file is the **runtime** anti-enumeration guard; the
 * copy file is the static one.
 *
 * ## Why "acknowledgement" instead of branching on success/error
 *
 * Epic 2.3's exit criteria say the forgot-password page must render
 * the same neutral completion copy for every backend response —
 * `200`, `4xx`, `429`, `5xx`, and the no-op "we would have sent an
 * email if the address existed" branch. The mapper collapses every
 * reachable kind into `acknowledgement`; the page renders the same
 * body via `recoveryCopy.forgot.acknowledgement.body`.
 *
 * ## Why a single 'invalid_link' kind for reset
 *
 * The backend returns `AUTH_INVALID_TOKEN` for unknown, expired, AND
 * consumed tokens. The mapper collapses the three into a single
 * `'invalid_link'` kind so the page renders one neutral body for all
 * three states. The page NEVER says "your token has expired" or
 * "your token is unknown" — the user cannot tell.
 *
 * ## Pure functions
 *
 * No `Date.now`, `Math.random`, network, or console access. The
 * vitest suite in TKT-2.3.D3 exercises every documented branch.
 */

import {
  asApiErrorShape,
  containsEnumerationOracle,
  RECOVERY_ERROR_CODES,
} from './auth-shapes';

export { containsEnumerationOracle, ENUMERATION_PHRASES, asApiErrorShape } from './auth-shapes';

/**
 * Result kinds for the forgot-password page state machine.
 *
 *   `acknowledgement` — every backend response (success or error).
 *                       The page renders the neutral body via
 *                       `recoveryCopy.forgot.acknowledgement.body`.
 *                       The discriminator is on the page's branch,
 *                       not on the body literal — the same string
 *                       is rendered for every reachable kind.
 *   `rate_limited`    — explicit `429` from the backend. The page
 *                       MAY overlay a retry-later copy and disable
 *                       the submit button for the cooldown window.
 *   `server`          — network failure or 5xx. The page renders the
 *                       neutral body, optionally with a global
 *                       "try again" overlay.
 *
 * `'invalid_link'` is NOT a kind for forgot-password because the
 * endpoint is anonymous — there is no token to be malformed. The
 * validation guard fires for the email format, but that is the
 * schema's job, not the mapper's.
 */
export type ForgotPasswordErrorKind =
  | 'acknowledgement'
  | 'rate_limited'
  | 'server';

export interface ForgotPasswordErrorResult {
  kind: ForgotPasswordErrorKind;
}

export function mapForgotPasswordError(err: unknown): ForgotPasswordErrorResult {
  const shape = asApiErrorShape(err);
  if (!shape) {
    // Unknown error shape (network failure, thrown non-Error, etc.)
    // — collapse to `acknowledgement` so the page renders the
    // neutral body. The mapper never returns a "we sent the email"
    // kind; success is the hook's `'cooldown'` state.
    return { kind: 'acknowledgement' };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  // Every other status — including 200, 400 (backend's
  // `class-validator` rejects the email), 401, 403, 404, 5xx —
  // collapses to `acknowledgement`. The page renders the same
  // neutral body.
  return { kind: 'acknowledgement' };
}

/**
 * Result kinds for the reset-password page state machine.
 *
 *   `success`       — the SDK call returned `201` (no thrown error).
 *                     The mapper never returns this directly; the
 *                     hook owns the success path. Documented here
 *                     for the union's exhaustiveness.
 *   `invalid_link`  — the backend returned `AUTH_INVALID_TOKEN`
 *                     (unknown / expired / consumed token). The page
 *                     renders the same neutral body for all three.
 *   `validation`    — the backend returned `400` with field-level
 *                     validation errors. The page renders a
 *                     recoverable failure copy.
 *   `rate_limited`  — explicit `429`. The page shows the cooldown
 *                     copy.
 *   `server`        — every other failure (5xx, network, unknown
 *                     shape). The page renders the recoverable
 *                     failure copy.
 */
export type ResetPasswordErrorKind =
  | 'success'
  | 'invalid_link'
  | 'validation'
  | 'rate_limited'
  | 'server';

export interface ResetPasswordErrorResult {
  kind: ResetPasswordErrorKind;
}

export function mapResetPasswordError(err: unknown): ResetPasswordErrorResult {
  const shape = asApiErrorShape(err);
  if (!shape) {
    return { kind: 'server' };
  }

  // `AUTH_INVALID_TOKEN` is the canonical code for the entire
  // invalid-token family — the backend collapses unknown, expired,
  // and consumed tokens into the same code. The mapper mirrors that
  // collapse into a single `'invalid_link'` kind.
  if (RECOVERY_ERROR_CODES.includes(shape.code) && shape.code === 'AUTH_INVALID_TOKEN') {
    return { kind: 'invalid_link' };
  }

  // `400` with `GLOBAL_VALIDATION_FAILED` is the password-strength
  // case: the client-side `passwordSchema` (Epic 2.1.D1) may have
  // allowed something the backend's `class-validator` still rejects
  // (e.g. a Unicode normalisation edge case). The page exposes a
  // recoverable failure copy; the user can re-enter the password.
  if (shape.status === 400 && shape.code === 'GLOBAL_VALIDATION_FAILED') {
    return { kind: 'validation' };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (shape.isServerError || shape.status === 0) {
    return { kind: 'server' };
  }

  // Any other status (401, 403, 404, 500, etc.) collapses to
  // `'server'`. We never surface the cause in copy, so the user
  // sees the same recoverable-failure message either way.
  return { kind: 'server' };
}

/**
 * Defensive helper for any future caller that wants to surface a
 * backend-supplied field-level message. Today no caller does — the
 * mappers above return kinds only — but the helper is exported so
 * TKT-2.3.D3 can assert the anti-enumeration contract at a single
 * seam rather than scatter `containsEnumerationOracle` calls.
 *
 * The helper is deliberately a thin wrapper around
 * `containsEnumerationOracle`. It is the only path through which a
 * backend message reaches a UI string.
 */
export function isEnumerationSafe(message: string): boolean {
  return !containsEnumerationOracle(message);
}

/**
 * Internal helper for the unit suite. The suite asserts the union
 * is exhaustive; the marker is the single source of truth for the
 * list of recognised recovery codes.
 *
 * Not exported to feature code.
 */
export const _RECOVERY_ERROR_CODES_REFERENCE = RECOVERY_ERROR_CODES;
