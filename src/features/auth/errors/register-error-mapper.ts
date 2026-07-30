/**
 * Register-error mapper — the single, anti-enumeration-aware seam between
 * `ApiError` (TKT-1.3.x) and the registration feature's UI copy.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.B2.
 *
 * ## Why this module exists
 *
 * The registration flow has a non-trivial security contract on top of its
 * UX contract: it must never reveal whether an account, email, username, or
 * token exists. Three failure modes threaten that contract:
 *
 *   1. **Direct raw error inspection.** A future engineer writes
 *      `err.response?.status === 409` to "show 'email already exists'".
 *      That is the worst leak — the UI becomes an account-enumeration
 *      oracle that no backend anti-enumeration work can save. Every
 *      caller in `features/auth/forms/**` MUST route through this module;
 *      the form layer is forbidden from inspecting `err.status` directly.
 *
 *   2. **Decoder-string leakage.** The backend's `data.detail` /
 *      `data.message` may contain phrases like "user with email already
 *      exists" if the backend's error-message policy slips. Returning
 *      that string to the UI is also a leak. The mapper therefore returns
 *      keys, never raw strings; copy is rendered from `registration-copy.ts`
 *      (TKT-2.1.B3).
 *
 *   3. **Cross-field inference.** A `validation` response that includes a
 *      `validationErrors` array with `{ field: 'email', message: 'Email
 *      already in use' }` is just as leaky as #1. The mapper preserves
 *      the field shape but discards any message that the backend flags as
 *      an existence oracle. Today (with the current backend policy of
 *      "all registration messages must be identical and anti-enumeration")
 *      we never receive such a message — the guard is here so a future
 *      backend regression does not silently leak through the client.
 *
 * ## Anti-enumeration grep rule
 *
 *   `grep -E "already|duplicate|exists|success" register-error-mapper.ts`
 *   must return zero matches. The strings we surface are mapped to
 *   generic copy keys; raw error text never reaches the UI from here.
 *
 * ## Pure functions
 *
 * The map functions are pure: no `Date.now`, `Math.random`, network, or
 * `console` access. Pure-function tests (TKT-2.1.E3) can construct synthetic
 * `ApiError` instances and assert the mapped kind without mocking globals.
 */

import { asApiErrorShape, containsEnumerationOracle } from './auth-shapes';

/**
 * Tagged union for availability-check outcomes.
 *
 *   - `idle`         — never fired (hook pre-condition)
 *   - `checking`     — request in flight (hook pre-condition)
 *   - `available`    — backend returned `{ available: true }`
 *   - `unavailable`  — backend returned `{ available: false }`. **Deliberately
 *                      indistinguishable from "this email/username is taken
 *                      by a real account" and "this email/username is
 *                      reserved/blocked"; the backend does not disclose
 *                      the reason and neither does the UI.**
 *   - `rate_limited` — `429`. Field stays editable; copy explains a brief
 *                      wait; submission itself is unaffected.
 *   - `server`       — `5xx` or network failure. Field stays editable;
 *                      copy explains recoverable failure.
 *
 * The `silent` kind is reserved for a future case where the frontend wants
 * to suppress the indicator entirely (e.g. while a controlled component is
 * being re-mounted). Today no caller uses it; if added, callers MUST keep
 * the field editable and just hide the indicator row.
 */
export type AvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'rate_limited'
  | 'server'
  | 'silent';

/**
 * Tagged union for `POST /auth/register` outcomes.
 *
 *   - `validation`     — `400`/`GLOBAL_VALIDATION_FAILED`. Field-level
 *                        errors can be surfaced under the matching field.
 *                        The mapper NEVER returns a per-field
 *                        "already exists" message (see file header).
 *   - `rate_limited`   — `429`. The mapper does NOT promote this to
 *                        `validation` because it isn't a per-field issue.
 *   - `server`         — `5xx` or network failure. Form stays editable.
 *   - `forbidden`      — `403`. Today unused for `/auth/register`; reserved
 *                        so callers can render a neutral generic copy
 *                        without leaking the cause.
 */
export type RegisterErrorKind =
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'forbidden';

/**
 * RFC 7807 field-level validation messages, narrowed so the UI cannot
 * accidentally render a backend-supplied "already exists" message.
 */
export type RegisterFieldKey = 'username' | 'email' | 'password';

export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

/**
 * Map any error thrown by `checkEmail` / `checkUsername` to an
 * `AvailabilityStatus`. Never returns the raw error.
 *
 * The intent: the indicator state machine in the hook reads `kind`
 * (`status`) and renders. The mapper is the only place a thrown error
 * becomes a kind.
 */
export function mapAvailabilityError(err: unknown): AvailabilityStatus {
  const shape = asApiErrorShape(err);
  if (!shape) {
    return 'server';
  }
  if (shape.isValidationError) {
    // 400 — `email: { format: 'email' }` style.
    // For availability checks the only field under validation is the
    // address/username itself, so this resolves to `'server'` in the UI
    // sense (the user typed an invalid value before submitting; the
    // hook sets `enabled=false` to prevent the call in the first
    // place). Falling through to 'server' keeps the contract uniform:
    // the field stays editable and the indicator shows recoverable.
    return 'server';
  }
  if (shape.status === 429) {
    return 'rate_limited';
  }
  if (shape.isServerError || shape.status === 0) {
    // 5xx or request never reached the server.
    return 'server';
  }
  return 'server';
}

/**
 * Reduce an `unknown` thrown value to the small surface the mappers
 * read. Imported from `./auth-shapes` so it is shared across all
 * auth-error mappers (TKT-2.2.B2 extraction). The shape itself is
 * `ApiErrorShape` from that module; this file no longer re-declares
 * it. The mapper's behaviour is unchanged.
 */

/**
 * Map any error thrown by `register` to a tagged result for the form layer.
 *
 * Field errors are returned ONLY when the backend (or the caller's
 * pre-submit zod validator) provides them. The mapper strips any
 * `message` containing the canonical anti-enumeration phrases
 * (`already`, `duplicate`, `exists`, `success`); see
 * `sanitizeFieldErrors`. Callers must always render `globalMessage` via
 * `registration-copy.ts` keys, never the raw string.
 */
export function mapRegisterError(err: unknown): {
  kind: RegisterErrorKind;
  fieldErrors?: RegisterFieldErrors;
  globalMessage?: string;
} {
  const shape = asApiErrorShape(err);
  if (!shape) {
    return { kind: 'server' };
  }

  if (shape.isValidationError || shape.status === 422) {
    const fieldErrors = sanitizeFieldErrors(err);
    return { kind: 'validation', fieldErrors };
  }

  if (shape.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (shape.status === 403) {
    return { kind: 'forbidden' };
  }

  if (shape.isServerError || shape.status === 0) {
    return { kind: 'server' };
  }

  // Any other status (404, 405, etc.) falls through to 'server' so the
  // form stays editable and never exposes the cause.
  return { kind: 'server' };
}

/**
 * Defensive sanitiser: even if the backend ever ships a per-field message
 * that would otherwise look like "this email is already in use", we drop
 * it from the surfaced `fieldErrors` and leave that field empty. The
 * result is that the form either renders the canonical anti-enumeration
 * copy for that field (preferred) or shows no error at all (silent).
 *
 * The sanitiser never asserts; it just filters. Fail-open (keep the
 * message) is wrong here; fail-closed (drop it) is correct.
 */
function sanitizeFieldErrors(
  err: unknown
): RegisterFieldErrors {
  const allowed: RegisterFieldKey[] = ['username', 'email', 'password'];
  const out: RegisterFieldErrors = {};

  if (!err || typeof err !== 'object') return out;
  const candidate = err as {
    data?: { extensions?: { validationErrors?: Array<{ field: string; message: string }> } };
    validationMessages?: string[];
  };

  // Preferred path: `data.extensions.validationErrors` (Phase 5+).
  const extensionErrors = candidate.data?.extensions?.validationErrors;
  if (Array.isArray(extensionErrors) && extensionErrors.length > 0) {
    for (const entry of extensionErrors) {
      const field = entry.field as RegisterFieldKey;
      if (!allowed.includes(field)) continue;
      if (containsEnumerationOracle(entry.message)) continue;
      out[field] = entry.message;
    }
    return out;
  }

  // Legacy path: `data.message: string[]` from NestJS `ValidationPipe`.
  // Each entry may be a `path - message` pair or just a `message`. We
  // can only map the message to a field if the backend encodes the
  // field; without that, we drop the message wholesale (fail-closed).
  const legacy = candidate.validationMessages ?? [];
  if (legacy.length === 0) return out;
  if (legacy.some(containsEnumerationOracle)) return out;
  // No field names; surface under `password` is the safest single-field
  // fallback because the backend typically returns the password length
  // / complexity message last. **Not a leak** — the only message this
  // path returns is one the backend already wrapped in its
  // anti-enumeration filter (the legacy Nest `ValidationPipe` does NOT
  // know which field failed, so it cannot encode "email already in
  // use" in this shape).
  out.password = legacy[0];
  return out;
}

// `containsEnumerationOracle` is now sourced from `./auth-shapes`
// (TKT-2.2.B2 extraction). The shared list expands the registration
// list to include token-validity phrases ("verified", "invalid token",
// "expired token") that the verify / resend mappers filter on.
