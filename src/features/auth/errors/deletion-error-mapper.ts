/**
 * Account-deletion error classifier — classifies deletion errors into
 * UI-facing kinds (`invalid_current`, `conflict`, `not_found`,
 * `auth_terminal`, `validation`, `uncertain`).
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T3.
 *
 * ## Purpose
 *
 * Provides a pure function that the deletion hook (`useDeleteAccount`,
 * 2.10.T12) dispatches on to decide:
 *
 *   - whether to return to password entry (preserving intent confirmation),
 *   - whether to block the retry gate with revalidation,
 *   - whether to delegate to the shared refresh/final-logout policy,
 *   - whether to treat the response as "uncertain — do NOT claim success
 *     without revalidating the account's existence".
 *
 * Counterpart to `password-error-mapper.ts` (2.9.T2) and
 * `session-error-mapper.ts` (2.8.T2).
 *
 * ## Why this exists
 *
 * Inlining the dispatch at each call site duplicates the safety rules
 * (`conflict` must require account-state revalidation before retry;
 * `uncertain` must NEVER transition to success without revalidation;
 * `not_found` must run the terminal cleanup because another tab
 * committed deletion). Centralizing the dispatch in a pure function
 * lets a single unit suite (planned in 2.10.T25) lock in every branch.
 *
 * ## Classification rules
 *
 * | Error condition                                | Classification    | Caller action |
 * |------------------------------------------------|-------------------|---------------|
 * | `AUTH_INVALID_CURRENT_PASSWORD`                | `invalid_current` | Field error on password; clear that field; preserve intent confirmation |
 * | `AUTH_DELETION_FAILED`                         | `conflict`        | Block retry; require `revalidateAccountExists()` before allowing another attempt |
 * | `USER_NOT_FOUND`                               | `not_found`       | The account was already deleted (another tab or backend cleanup); treat the local cleanup path as authoritative |
 * | `AUTH_INVALID_TOKEN`                           | `auth_terminal`   | Shared refresh/final-logout policy |
 * | `AUTH_RESOURCE_CONFLICT`                       | `conflict`        | Banner; require revalidation before retry |
 * | `GLOBAL_VALIDATION_FAILED`                     | `validation`      | Render validation messages (extracted from `validationMessages`) |
 * | `0` / `429` / `5xx`                            | `uncertain`        | Network / server uncertainty; do NOT claim success; force `revalidateAccountExists()` before any retry |
 * | Unknown code                                    | `uncertain`        | Conservative; do NOT claim success |
 *
 * ## Why `uncertain` is not called `retryable`
 *
 * The password and session mappers call their equivalent kind
 * `'retryable'` because retrying those endpoints is safe. For deletion,
 * retrying without revalidation can hit an account that has already
 * been deleted, producing confusing 404 noise. The mapper therefore
 * names the kind `'uncertain'` and the hook layer is required to gate
 * retry behind a revalidation call (`useDeleteAccount` 2.10.T13).
 *
 * ## Pure function contract
 *
 * No `Date.now`, no `Math.random`, no network, no `console`. The
 * vitest suite (planned in 2.10.T25) depends on this contract.
 */

import {
  AUTH_DELETION_FAILED,
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_INVALID_TOKEN,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
  USER_NOT_FOUND,
  isDeletionRecoverableStatus,
  isUserNotFoundError,
} from './deletion-error-codes';

/**
 * Result of classifying a deletion error.
 *
 * `kind` is the UI-facing kind; `code` and `status` are preserved for
 * logging and for hooks that want to attach a structured log entry.
 * `validationMessages` is preserved on the `'validation'` branch so
 * the caller can show the field-level messages from the backend's
 * `class-validator` output.
 */
export type DeletionErrorClassification =
  | {
      kind: 'invalid_current';
      code: typeof AUTH_INVALID_CURRENT_PASSWORD;
      status: number;
    }
  | {
      kind: 'conflict';
      code: typeof AUTH_DELETION_FAILED | typeof AUTH_RESOURCE_CONFLICT;
      status: number;
    }
  | {
      kind: 'not_found';
      code: typeof USER_NOT_FOUND;
      status: number;
    }
  | {
      kind: 'auth_terminal';
      code: typeof AUTH_INVALID_TOKEN;
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
      kind: 'uncertain';
      code: string;
      status: number;
    };

/**
 * Input shape for the classifier.
 *
 * Mirrors the small surface of `ApiError` that the dispatcher needs.
 * Hooks build this from a real `ApiError` (or the synthetic shapes
 * used in unit tests).
 *
 * `validationMessages` is optional — only the `'validation'` branch
 * reads it; passing it on other branches is harmless.
 */
export interface DeletionErrorInput {
  code: string;
  status: number;
  validationMessages?: string[];
}

/**
 * Classify an account-deletion error into a UI-facing kind.
 *
 * @param error - The error from `DELETE /auth/account`
 * @returns Classification indicating what the hook should do
 *
 * @example
 * ```typescript
 * try {
 *   await deleteAccount({ password });
 * } catch (err) {
 *   const c = mapDeletionError({
 *     code: err.code,
 *     status: err.status,
 *     validationMessages: err.validationMessages,
 *   });
 *   if (c.kind === 'invalid_current') {
 *     showFieldError('password', 'Current password is incorrect');
 *     clearField('password');
 *     // Intent confirmation stays.
 *   } else if (c.kind === 'conflict') {
 *     await revalidateAccountExists();
 *   } else if (c.kind === 'not_found') {
 *     await runFinalization();
 *   } else if (c.kind === 'auth_terminal') {
 *     // follow refresh/final-logout policy
 *   } else if (c.kind === 'validation') {
 *     showValidationMessages(c.validationMessages);
 *   } else {
 *     // 'uncertain' — do NOT claim success; show "not confirmed".
 *   }
 * }
 * ```
 */
export function mapDeletionError(
  error: DeletionErrorInput,
): DeletionErrorClassification {
  // AUTH_INVALID_CURRENT_PASSWORD — field-level error on the password
  // field. Dispatched first because the caller needs to clear the
  // field, which is a stronger UX response than a modal-level banner.
  if (error.code === AUTH_INVALID_CURRENT_PASSWORD) {
    return {
      kind: 'invalid_current',
      code: AUTH_INVALID_CURRENT_PASSWORD,
      status: error.status,
    };
  }

  // AUTH_DELETION_FAILED — concurrent / already-deleted / generic
  // conflict. Caller MUST revalidate before allowing another attempt.
  if (error.code === AUTH_DELETION_FAILED) {
    return {
      kind: 'conflict',
      code: AUTH_DELETION_FAILED,
      status: error.status,
    };
  }

  // USER_NOT_FOUND on the deletion endpoint means "the account no
  // longer exists". Folding into a distinct `'not_found'` kind lets
  // the hook recognize that the deletion is effectively committed
  // and run the local cleanup without a 4xx banner.
  if (isUserNotFoundError(error.code)) {
    return {
      kind: 'not_found',
      code: USER_NOT_FOUND,
      status: error.status,
    };
  }

  // GLOBAL_VALIDATION_FAILED — the backend's `class-validator`
  // rejected the password against a rule (e.g. empty string). The
  // mapper preserves `validationMessages` so the caller can render
  // the readable messages.
  if (error.code === GLOBAL_VALIDATION_FAILED) {
    return {
      kind: 'validation',
      code: GLOBAL_VALIDATION_FAILED,
      status: error.status,
      validationMessages: error.validationMessages ?? [],
    };
  }

  // AUTH_INVALID_TOKEN: terminal — the shared refresh/final-logout
  // policy owns this path; the deletion mapper just marks it.
  if (error.code === AUTH_INVALID_TOKEN) {
    return {
      kind: 'auth_terminal',
      code: AUTH_INVALID_TOKEN,
      status: error.status,
    };
  }

  // 409 conflict — preserve current session, surface a banner, force
  // revalidation. The primary use case is the OAuth-linked account
  // path; the UI renders the generic conflict copy and offers a
  // revalidation CTA.
  if (error.code === AUTH_RESOURCE_CONFLICT) {
    return {
      kind: 'conflict',
      code: AUTH_RESOURCE_CONFLICT,
      status: error.status,
    };
  }

  // Retryable status (network / 5xx / 429) — fail open to a
  // `'uncertain'` kind. Critically, this is NOT a `'retryable'` kind
  // for deletion: the hook must revalidate the account's existence
  // before allowing another attempt, because the request may have
  // committed server-side and the response was lost.
  if (isDeletionRecoverableStatus(error.status)) {
    return {
      kind: 'uncertain',
      code: error.code,
      status: error.status,
    };
  }

  // Final fallback: unknown error — treat as `'uncertain'`.
  // This is intentionally conservative. The hook layer must show
  // a "deletion not confirmed" message and gate any retry behind
  // revalidation.
  return {
    kind: 'uncertain',
    code: error.code,
    status: error.status,
  };
}

/**
 * Returns true when the classification is `invalid_current`.
 * Convenience helper for conditional logic.
 */
export function isInvalidCurrentPasswordDeletion(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'invalid_current' }> {
  return classification.kind === 'invalid_current';
}

/**
 * Returns true when the classification is `conflict`.
 * Convenience helper for the revalidation gate.
 */
export function isDeletionConflict(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'conflict' }> {
  return classification.kind === 'conflict';
}

/**
 * Returns true when the classification is `not_found`.
 * Convenience helper for the local-cleanup terminal path.
 */
export function isDeletionNotFound(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'not_found' }> {
  return classification.kind === 'not_found';
}

/**
 * Returns true when the classification is `auth_terminal`.
 * Convenience helper for the shared refresh/final-logout policy.
 */
export function isAuthTerminalDeletionError(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'auth_terminal' }> {
  return classification.kind === 'auth_terminal';
}

/**
 * Returns true when the classification is `validation`.
 * Convenience helper for the per-field error copy.
 */
export function isDeletionValidation(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'validation' }> {
  return classification.kind === 'validation';
}

/**
 * Returns true when the classification is `uncertain`.
 * Convenience helper for the "deletion not confirmed" banner and the
 * revalidation-before-retry gate.
 */
export function isDeletionUncertain(
  classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'uncertain' }> {
  return classification.kind === 'uncertain';
}
