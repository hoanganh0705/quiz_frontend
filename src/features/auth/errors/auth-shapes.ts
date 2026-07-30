/**
 * Shared auth-error shape — the duck-typed `ApiError` projection used
 * by every error mapper under `features/auth/errors/*`.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.B2.
 *
 * ## Why this file exists
 *
 * The error mappers (`mapRegisterError`, `mapVerifyEmailError`,
 * `mapResendVerificationError`, ...) share the same input surface
 * — a small projection of `ApiError` that can be duck-typed without
 * pulling the SDK into unit tests:
 *
 *   { code, status, isValidationError, isServerError, validationMessages, data? }
 *
 * Before TKT-2.2.B2, this shape was private to
 * `register-error-mapper.ts` (TKT-2.1.B2). TKT-2.2.B2 lifts the
 * shared helpers (`asApiErrorShape`, `containsEnumerationOracle`,
 * the phrase list) into this module so each mapper imports from
 * here. The duck-typed mapper contract — pure dispatch on a small
 * surface, no `instanceof ApiError` — is preserved.
 *
 * ## When to add to this file
 *
 * Add a shared helper here if it is consumed by more than one
 * mapper. If a helper is mapper-specific (e.g. a function that
 * normalises a particular DTO's `data.message: string[]`), keep it
 * private to that mapper.
 *
 * ## Pure-function contract
 *
 * Every export below is pure. No `Date.now`, no `Math.random`, no
 * network, no `console`. The vitest suites in TKT-2.1.E3 and
 * TKT-2.2.E3 are constructed against these guarantees.
 */

/**
 * The shape mappers read. Kept private to the mappers that import
 * this module — feature code never imports `ApiErrorShape` directly.
 */
export interface ApiErrorShape {
  code: string;
  status: number;
  isValidationError: boolean;
  isServerError: boolean;
  validationMessages: string[];
}

/**
 * Reduce an `unknown` thrown value to the small surface the mappers
 * read. Accepts both real `ApiError` instances and synthetic shapes
 * from the unit suite without coupling test code to the SDK.
 *
 * Returns `null` when the input is not even shaped like an
 * `ApiError` — mappers use that to fall through to a generic
 * `'server'` kind rather than guess.
 */
export function asApiErrorShape(err: unknown): ApiErrorShape | null {
  if (!err || typeof err !== 'object') return null;
  const obj = err as Partial<ApiErrorShape>;
  if (
    typeof obj.status !== 'number' ||
    typeof obj.code !== 'string' ||
    typeof obj.isValidationError !== 'boolean' ||
    typeof obj.isServerError !== 'boolean' ||
    !Array.isArray(obj.validationMessages)
  ) {
    return null;
  }
  return {
    code: obj.code,
    status: obj.status,
    isValidationError: obj.isValidationError,
    isServerError: obj.isServerError,
    validationMessages: obj.validationMessages,
  };
}

/**
 * Anti-enumeration phrases that, if present in any string the
 * backend might ship, must NOT reach the user-facing copy.
 *
 * The list is intentionally narrow: it covers the canonical
 * account-existence and token-validity phrases a careful attacker
 * would search for. Adding a phrase here does NOT cause it to be
 * stripped automatically — each mapper calls
 * `containsEnumerationOracle(message)` explicitly and decides what
 * to drop.
 *
 * Reviewers: if the backend ever adds a new error code that ships
 * an oracle phrase, do NOT add it to this list and call it done.
 * The mapper author must also update the sanitiser in the same
 * PR, and add a vitest case (TKT-2.2.E3).
 */
export const ENUMERATION_PHRASES: ReadonlyArray<string> = Object.freeze([
  'already',
  'duplicate',
  'exists',
  'taken',
  'in use',
  'verified',
  'invalid token',
  'expired token',
  'success',
  'account created',
]);

/**
 * True when `message` contains a phrase that would betray account
 * existence, token validity, or any other state an attacker could
 * use as an oracle. Case-insensitive; covers the canonical list
 * plus a few common synonyms.
 *
 * The check is conservative: if the phrase is present anywhere in
 * the message, the mapper should drop the message. Fail-open
 * (keep the message) is wrong here; fail-closed (drop it) is
 * correct.
 */
export function containsEnumerationOracle(message: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return ENUMERATION_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * The set of `extensions.code` values that an auth-recovery mapper
 * (forgot / reset) MUST recognise. The mapper dispatches on the
 * code, not on the HTTP status, because the backend uses the same
 * `400` status for many distinct failure modes — only the code
 * distinguishes `'invalid_token'` from `'validation_failed'`.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.B2.
 *
 * The set is intentionally narrow. The mapper does NOT iterate over
 * the entire `ErrorCode` union (122 members); it only cares about
 * the three codes that gate the recovery flow:
 *
 *   - `AUTH_INVALID_TOKEN` — reset only; the backend returns this
 *       for unknown, expired, and consumed tokens. The mapper
 *       collapses the three into a single `'invalid_link'` kind.
 *   - `GLOBAL_VALIDATION_FAILED` — reset only; the backend's
 *       `class-validator` emits this when the new password
 *       violates a rule that the client-side `passwordSchema` did
 *       not catch. The mapper returns `'validation'` and the page
 *       shows the recoverable failure copy.
 *   - `GLOBAL_RATE_LIMITED` — both endpoints; the backend's
 *       `@Throttle()` decorator emits this on `429`. The mapper
 *       returns `'rate_limited'`.
 */
export type RecoveryErrorCode =
  | 'AUTH_INVALID_TOKEN'
  | 'GLOBAL_VALIDATION_FAILED'
  | 'GLOBAL_RATE_LIMITED';

/**
 * Convenience: pull the synthetic code list out of the
 * `auth-shapes` module so the recovery mapper can dispatch on it
 * without re-importing from `@/lib/api/error-codes`.
 */
export const RECOVERY_ERROR_CODES: ReadonlyArray<string> = Object.freeze([
  'AUTH_INVALID_TOKEN',
  'GLOBAL_VALIDATION_FAILED',
  'GLOBAL_RATE_LIMITED',
]);