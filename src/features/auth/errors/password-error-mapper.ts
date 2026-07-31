/**
 * Password-management error classifier — classifies password errors
 * into UI-facing kinds (`invalid_current`, `reuse`, `validation`,
 * `auth_terminal`, `conflict`, `retryable`).
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T2.
 *
 * ## Purpose
 *
 * Provides a pure function that the password-management hooks
 * (`useVerifyPassword`, `useChangePassword`) dispatch on to decide:
 *
 *   - whether to render a field-level error (and which field),
 *   - whether to render a banner with retry,
 *   - whether to delegate to the shared refresh/final-logout policy.
 *
 * Counterpart to `session-error-mapper.ts` (2.8.T2). Like the
 * session mapper, this is target-free in the user-visible sense:
 * the same code (e.g. `AUTH_INVALID_CURRENT_PASSWORD`) means the
 * same thing whether it came from `verify-password` or
 * `change-password` — the dispatcher does not need to know which.
 * The hooks already know which endpoint fired, so a `target`
 * discriminator would be redundant.
 *
 * ## Why this exists
 *
 * Inlining the dispatch at each call site duplicates the security
 * rules (`invalid_current` must clear the current-password field;
 * `reuse` must clear the new-password field; etc). Centralizing the
 * dispatch in a pure function lets a single unit suite (planned for
 * 2.9.T19) lock in every branch.
 *
 * ## Classification rules
 *
 * | Error condition                       | Classification   | Caller action |
 * |---------------------------------------|------------------|---------------|
 * | `AUTH_INVALID_CURRENT_PASSWORD`       | `invalid_current`| Field error on current; clear that field |
 * | `AUTH_PASSWORD_REUSE`                  | `reuse`          | Field error on newPassword |
 * | `GLOBAL_VALIDATION_FAILED`             | `validation`     | Render validation messages (extracted from `validationMessages`) |
 * | `AUTH_INVALID_TOKEN`                   | `auth_terminal`  | Refresh-cooldown policy |
 * | `AUTH_RESOURCE_CONFLICT`               | `conflict`       | Banner; preserve current session |
 * | `429` / `5xx` / network (`status 0`)   | `retryable`      | Banner with retry |
 * | Unknown code                           | `retryable`      | Conservative; banner with retry |
 *
 * ## Pure function contract
 *
 * No `Date.now`, no `Math.random`, no network, no `console`. The
 * vitest suite (planned for 2.9.T19) depends on this contract.
 */

import {
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_INVALID_TOKEN,
  AUTH_PASSWORD_REUSE,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
  isPasswordRecoverableStatus,
} from './password-error-codes';

/**
 * Result of classifying a password error.
 *
 * `kind` is the UI-facing kind; `code` and `status` are preserved for
 * logging and for hooks that want to attach a structured log entry.
 * `validationMessages` is preserved on the `'validation'` branch so
 * the caller can show the field-level messages from the backend's
 * `class-validator` output.
 */
export type PasswordErrorClassification =
  | {
      kind: 'invalid_current';
      code: typeof AUTH_INVALID_CURRENT_PASSWORD;
      status: number;
    }
  | {
      kind: 'reuse';
      code: typeof AUTH_PASSWORD_REUSE;
      status: number;
    }
  | {
      kind: 'validation';
      code: typeof GLOBAL_VALIDATION_FAILED;
      status: number;
      /** Per-field validation messages from the backend's `class-validator`. */
      validationMessages: string[];
    }
  | {
      kind: 'auth_terminal';
      code: typeof AUTH_INVALID_TOKEN;
      status: number;
    }
  | {
      kind: 'conflict';
      code: typeof AUTH_RESOURCE_CONFLICT;
      status: number;
    }
  | {
      kind: 'retryable';
      code: string;
      status: number;
    };

/**
 * Input shape for the classifier.
 *
 * Mirrors the small surface of `ApiError` that the dispatcher needs.
 * Hooks build this from a real `ApiError` (or the synthetic shapes
 * used in unit tests) via `asApiErrorShape` from `auth-shapes.ts`.
 *
 * `validationMessages` is optional — only the `'validation'` branch
 * reads it; passing it on other branches is harmless.
 */
export interface PasswordErrorInput {
  code: string;
  status: number;
  validationMessages?: string[];
}

/**
 * Classify a password-management error into a UI-facing kind.
 *
 * @param error - The error from a password-management endpoint
 * @returns Classification indicating what the hook should do
 *
 * @example
 * ```typescript
 * try {
 *   await changePassword({ currentPassword, newPassword });
 * } catch (err) {
 *   const c = mapPasswordError({
 *     code: err.code,
 *     status: err.status,
 *     validationMessages: err.validationMessages,
 *   });
 *   if (c.kind === 'invalid_current') {
 *     showFieldError('currentPassword', 'Current password is incorrect');
 *     clearField('currentPassword');
 *   } else if (c.kind === 'reuse') {
 *     showFieldError('newPassword', 'Choose a password you haven\'t used before');
 *   } else if (c.kind === 'validation') {
 *     showValidationMessages(c.validationMessages);
 *   } else if (c.kind === 'auth_terminal') {
 *     // follow refresh/final-logout policy
 *   } else if (c.kind === 'conflict') {
 *     showBanner('Conflict');
 *   } else {
 *     showBanner('Retry');
 *   }
 * }
 * ```
 */
export function mapPasswordError(
  error: PasswordErrorInput,
): PasswordErrorClassification {
  // AUTH_INVALID_CURRENT_PASSWORD — field-level error on the
  // current-password field. Dispatched first because the caller
  // needs to clear the field, which is a stronger UX response than
  // a modal-level banner.
  if (error.code === AUTH_INVALID_CURRENT_PASSWORD) {
    return {
      kind: 'invalid_current',
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: error.status,
    };
  }

  // AUTH_PASSWORD_REUSE — field-level error on the new-password
  // field. The backend does NOT disclose which previous password
  // matched (the validator checks against the user's history and
  // returns the same code regardless of cause), so the caller
  // renders a single generic "Choose a password you haven't used
  // before" message.
  if (error.code === AUTH_PASSWORD_REUSE) {
    return {
      kind: 'reuse',
      code: AUTH_PASSWORD_REUSE,
      status: error.status,
    };
  }

  // GLOBAL_VALIDATION_FAILED — the backend's `class-validator`
  // rejected the new password against a rule the client-side
  // `password-strength.ts` did not catch. The mapper preserves
  // `validationMessages` so the caller can render the readable
  // messages; falls back to an empty array if the caller did not
  // pass them.
  if (error.code === GLOBAL_VALIDATION_FAILED) {
    return {
      kind: 'validation',
      code: GLOBAL_VALIDATION_FAILED,
      status: error.status,
      validationMessages: error.validationMessages ?? [],
    };
  }

  // AUTH_INVALID_TOKEN: terminal — the shared refresh/final-logout
  // policy owns this path; the password mapper just marks it.
  if (error.code === AUTH_INVALID_TOKEN) {
    return {
      kind: 'auth_terminal',
      code: AUTH_INVALID_TOKEN,
      status: error.status,
    };
  }

  // 409 conflict — preserve current session, surface a banner.
  // The primary use case on password endpoints is an OAuth-only
  // account that has no local password; the UI routes through the
  // Epic 2.3 forgot-password flow. The mapper does not branch
  // on that case directly — the 409 is passed up to the caller,
  // which renders the generic conflict copy and exposes the
  // recovery link.
  if (error.code === AUTH_RESOURCE_CONFLICT) {
    return {
      kind: 'conflict',
      code: AUTH_RESOURCE_CONFLICT,
      status: error.status,
    };
  }

  // Retryable: rate limit / server error / network — fail open to
  // a banner with retry. The status check covers 0/429/5xx
  // uniformly; the code itself is preserved for logging.
  if (isPasswordRecoverableStatus(error.status)) {
    return {
      kind: 'retryable',
      code: error.code,
      status: error.status,
    };
  }

  // Final fallback: unknown error — treat as retryable.
  // This is intentionally permissive. A true unknown terminal
  // error would manifest as a 401 (covered by AUTH_INVALID_TOKEN
  // above) or a 5xx (already covered). Bucketing the remainder as
  // `'retryable'` lets the user retry, which is the desired
  // behaviour for an authenticated password-management call.
  return {
    kind: 'retryable',
    code: error.code,
    status: error.status,
  };
}

/**
 * Returns true when the classification is `invalid_current`.
 * Convenience helper for conditional logic.
 */
export function isInvalidCurrentPassword(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'invalid_current' }> {
  return classification.kind === 'invalid_current';
}

/**
 * Returns true when the classification is `reuse`.
 * Convenience helper for conditional logic.
 */
export function isPasswordReuse(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'reuse' }> {
  return classification.kind === 'reuse';
}

/**
 * Returns true when the classification is `validation`.
 * Convenience helper for conditional logic.
 */
export function isPasswordValidation(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'validation' }> {
  return classification.kind === 'validation';
}

/**
 * Returns true when the classification is `auth_terminal`.
 * Convenience helper for the shared refresh/final-logout policy.
 */
export function isAuthTerminalPasswordError(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'auth_terminal' }> {
  return classification.kind === 'auth_terminal';
}

/**
 * Returns true when the classification is `conflict`.
 * Convenience helper for the conflict banner.
 */
export function isPasswordConflict(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'conflict' }> {
  return classification.kind === 'conflict';
}

/**
 * Returns true when the classification is `retryable`.
 * Convenience helper for the banner + retry path.
 */
export function isPasswordErrorRetryable(
  classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'retryable' }> {
  return classification.kind === 'retryable';
}
