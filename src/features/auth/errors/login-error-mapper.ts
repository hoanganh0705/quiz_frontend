/**
 * Login + logout error mapper.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.B3.
 *
 * ## What this file does
 *
 * Two pure mappers that translate an `unknown` thrown by
 * `auth.service.login` / `auth.service.logout` into a UI-facing
 * kind:
 *
 *   `mapLoginError(err)` → `{ kind: 'invalid_credentials' | 'rate_limited' | 'validation' | 'server' }`
 *   `mapLogoutError(err)` → `{ kind: 'ok' | 'server' }`
 *
 * The mappers NEVER return a string the backend shipped. Every
 * string the user sees is sourced from `login-copy.ts` via its
 * keys. This file is the **runtime** anti-enumeration guard; the
 * copy file is the static one.
 *
 * ## Why "invalid_credentials" is the catch-all for 401 + verify-related messages
 *
 * Epic 2.4's exit criteria require that the page renders the same
 * neutral credentials-error body for every backend response that
 * could plausibly reveal account state. The existing `/login/page.tsx`
 * (A2 LEAK-3) reads the backend's error message verbatim and surfaces
 * a verification banner — the canonical account-existence oracle.
 * The mapper collapses three distinct cases into one kind:
 *
 *   - `AUTH_INVALID_CREDENTIALS` (canonical wrong-email / wrong-password code);
 *   - a generic `401` (the SDK's status fallback when the response has no body);
 *   - any backend message matching `/verify|verified|verification/i` (the
 *     previous oracle — collapsed here so the page NEVER branches on the
 *     backend's message).
 *
 * A future reviewer who tries to differentiate the three will find no
 * path through the mapper — by design. The discriminators the backend
 * ships are an implementation detail of the auth module; the frontend's
 * job is to surface ONE message.
 *
 * ## Why `mapLogoutError` returns `'ok'` for `null` / `undefined`
 *
 * Logout is locally successful by definition (TKT-2.4.B1). The local
 * cleanup (`clearAuthToken` + `LOGGED_OUT` broadcast) runs in the
 * service's `finally` block regardless of the backend's response. The
 * mapper only flags whether the backend acknowledged — the discriminator
 * exists for the C4 hook's "We couldn't confirm with the server" copy,
 * not for the cleanup invariant.
 *
 * ## Pure functions
 *
 * No `Date.now`, `Math.random`, network, or console access. The
 * vitest suite in TKT-2.4.D3 exercises every documented branch.
 */

import { asApiErrorShape, containsEnumerationOracle } from './auth-shapes';

// Re-export shared helpers so existing feature code that imported them
// from the recovery mapper continues to find them. New code MUST
// import from `auth-shapes` directly; the re-export exists for
// migration continuity only.
export { containsEnumerationOracle, ENUMERATION_PHRASES, asApiErrorShape } from './auth-shapes';

/**
 * Result kinds for the login page state machine.
 *
 *   `invalid_credentials` — every backend response that could
 *                           reveal account state (`AUTH_INVALID_CREDENTIALS`,
 *                           generic `401`, or any verify-related message).
 *                           The page renders the same neutral
 *                           credentials-error body for all three.
 *   `rate_limited`        — explicit `429`. The page shows the
 *                           retry-later copy without clearing the
 *                           email field.
 *   `validation`          — `400 GLOBAL_VALIDATION_FAILED`. The
 *                           page shows the recoverable-failure copy;
 *                           the password field is highlighted.
 *   `server`              — every other failure (`5xx`, network,
 *                           unknown shape). The page renders the
 *                           recoverable-failure copy.
 *
 * There is NO `'account_not_found'`, `'wrong_password'`, or
 * `'unverified'` kind by design. The backend's anti-enumeration
 * contract carries through; the page never reveals which case
 * applies.
 */
export type LoginErrorKind =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'validation'
  | 'server';

export interface LoginErrorResult {
  kind: LoginErrorKind;
}

/**
 * Phrase list that triggers the `'invalid_credentials'` collapse.
 *
 * The list is intentionally narrow. The mapper recognises the
 * canonical verification-state phrases the backend has shipped
 * historically; adding a phrase here is the canonical place to
 * collapse a new oracle.
 *
 * NOTE: the canonical `ENUMERATION_PHRASES` list in `auth-shapes.ts`
 * is for copy-string sanitisation. The list below is for the mapper's
 * error-message dispatch — a different concern. The two lists do not
 * need to be synchronised: copy sanitisation is about what the UI
 * shows; mapper dispatch is about what the backend said.
 */
const VERIFY_RELATED_PHRASES: ReadonlyArray<string> = Object.freeze([
  'verify',
  'verified',
  'verification',
]);

/**
 * Canonical backend code for the credentials family. The backend
 * collapses "wrong email" + "wrong password" into this single code
 * so the frontend never has to differentiate.
 */
const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';

/**
 * Backend code for `400` with field-level validation errors (e.g.
 * the password violated a backend-only rule). The mapper surfaces
 * a recoverable failure copy.
 */
const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED';

/**
 * Translate an `unknown` thrown by `auth.service.login` into a
 * UI-facing kind.
 *
 * Dispatch order:
 *
 *   1. `429` → `'rate_limited'` regardless of code.
 *   2. `400 GLOBAL_VALIDATION_FAILED` → `'validation'`.
 *   3. `AUTH_INVALID_CREDENTIALS` → `'invalid_credentials'`.
 *   4. Generic `401` (no code or any non-`AUTH_INVALID_CREDENTIALS` code
 *      on a `401`) → `'invalid_credentials'` if the message matches
 *      the verify-related phrase list, ELSE `'server'`. (A `401` with
 *      an unrelated message is almost always a backend bug — flag it
 *      as a server error so the page shows the recoverable copy.)
 *   5. `5xx` or network failure (`status === 0`) → `'server'`.
 *   6. Anything else → `'server'`.
 *
 * The mapper NEVER returns a string. The page renders one of:
 *
 *   - `login.error.invalidCredentials.body` for `'invalid_credentials'`,
 *   - `login.error.rateLimited` for `'rate_limited'`,
 *   - `login.error.validation` for `'validation'`,
 *   - `login.error.server` for `'server'`.
 */
export function mapLoginError(err: unknown): LoginErrorResult {
  const shape = asApiErrorShape(err);
  if (!shape) {
    // Unknown error shape — network failure, thrown non-Error, etc.
    // The page shows the recoverable-failure copy.
    return { kind: 'server' };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (shape.status === 400 && shape.code === GLOBAL_VALIDATION_FAILED) {
    return { kind: 'validation' };
  }

  // The verify-banner oracle. The previous `/login/page.tsx` (A2
  // LEAK-3) branched on `/verify|verified|verification/i` and
  // surfaced a verification state — the canonical account-existence
  // oracle. The mapper collapses ANY 401 whose message matches the
  // phrase list into `'invalid_credentials'` so the page renders the
  // same body it would for a plain wrong password.
  const isVerifyRelated = shape.validationMessages.some((m) =>
    VERIFY_RELATED_PHRASES.some((phrase) => m.toLowerCase().includes(phrase))
  );

  if (shape.status === 401) {
    if (shape.code === AUTH_INVALID_CREDENTIALS) {
      return { kind: 'invalid_credentials' };
    }
    if (isVerifyRelated) {
      return { kind: 'invalid_credentials' };
    }
    // Bare `401` with no recognisable code and no verify-related
    // message — likely a backend bug. Surface as a server error so
    // the page does not display a misleading "wrong credentials"
    // message that the user cannot act on.
    return { kind: 'server' };
  }

  if (shape.isServerError || shape.status === 0) {
    return { kind: 'server' };
  }

  // Any other status (`403`, `404`, `418`, etc.) collapses to
  // `'server'`. The page renders the recoverable-failure copy.
  return { kind: 'server' };
}

/**
 * Result kinds for the logout state machine.
 *
 *   `ok`     — the backend acknowledged the logout OR no error was
 *              thrown (including `null` / `undefined` inputs). The
 *              local cleanup has already happened in the service's
 *              `finally` block; the page routes the user to `/`.
 *   `server` — a thrown error from the backend (`5xx`, network).
 *              The local cleanup STILL happened (the `finally`
 *              invariant) — this kind exists only so the page can
 *              optionally overlay a "We couldn't confirm with the
 *              server" message before routing.
 */
export type LogoutErrorKind = 'ok' | 'server';

export interface LogoutErrorResult {
  kind: LogoutErrorKind;
}

/**
 * Translate an `unknown` thrown by `auth.service.logout` into a
 * UI-facing kind.
 *
 * The mapper is permissive: `'ok'` is the default for any input
 * that is not a recognisable thrown error. This matches the
 * documented contract that logout is locally successful by
 * definition (TKT-2.4.B1).
 *
 * Note that `null` and `undefined` are explicitly mapped to `'ok'`
 * so the C4 hook's call site — `await auth.service.logout()` —
 * yields a usable result even when the runtime somehow passes a
 * falsy err.
 */
export function mapLogoutError(err: unknown): LogoutErrorResult {
  if (err === null || err === undefined) {
    return { kind: 'ok' };
  }

  const shape = asApiErrorShape(err);
  if (!shape) {
    // Non-shaped thrown value (e.g. `throw 'logout failed'`). Still
    // flag as server error — the user's logout succeeded locally but
    // the backend did not confirm.
    return { kind: 'server' };
  }

  if (shape.isServerError || shape.status === 0) {
    return { kind: 'server' };
  }

  // Any non-2xx status (`401`, `4xx` etc.) collapses to `'server'`
  // here too — the backend acknowledged the logout failed but the
  // local cleanup already happened.
  return { kind: 'server' };
}

/**
 * Defensive helper for any future caller that wants to surface a
 * backend-supplied field-level message. Today no caller does — the
 * mappers above return kinds only — but the helper is exported so
 * TKT-2.4.D3 can assert the anti-enumeration contract at a single
 * seam rather than scatter `containsEnumerationOracle` calls.
 *
 * The helper is deliberately a thin wrapper around
 * `containsEnumerationOracle`. It is the only path through which a
 * backend message reaches a UI string.
 */
export function isEnumerationSafe(message: string): boolean {
  return !containsEnumerationOracle(message);
}
