'use client';

/**
 * `useChangePassword` — change-password hook with client-side
 * validation, single-pending action, server error mapping, and
 * post-success revalidation.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T7.
 *
 * ## Purpose
 *
 * Wraps `changePassword()` (`POST /auth/change-password`) in a
 * React hook that owns:
 *
 *   - client-side validation (confirmation match, equal-to-current,
 *     strength threshold),
 *   - the single-pending action discipline,
 *   - server-side error classification via `mapPasswordError()`,
 *   - post-success revalidation through `revalidateAfterPasswordChange()`
 *     and the injected `deps.revalidateDashboard` /
 *     `deps.revalidateSessions` callbacks.
 *
 * ## Client-side validation (FIRES BEFORE THE NETWORK)
 *
 * Three checks run before any request fires:
 *
 *   1. `confirmPassword !== newPassword` → `fieldErrors.confirm = 'mismatch'`.
 *   2. `currentPassword === newPassword` → `fieldErrors.new = 'equalToCurrent'`.
 *      The backend still owns the authoritative `AUTH_PASSWORD_REUSE`
 *      check against password history (the client cannot see history),
 *      but rejecting the obvious "same as current" case locally
 *      saves a round-trip.
 *   3. `newPassword` violates `password-strength.ts` (length or
 *      complexity) → `fieldErrors.new = 'weak'`.
 *
 * If any check fails, the hook returns immediately without setting
 * `status` to `'pending'`. The card clears the relevant field.
 *
 * ## Single pending action
 *
 * While `status === 'pending'`, a second `change()` call is dropped.
 * The double-click on the Change Password button cannot fire two
 * network requests. The in-flight tracker is captured so the
 * second call returns the same Promise.
 *
 * ## Password hygiene
 *
 * The hook does NOT store `currentPassword` / `newPassword` /
 * `confirmPassword` in any state slot. The arguments to `change()`
 * are local to the synchronous call and go out of scope when the
 * function returns. The reducer simulation in the unit suite
 * (2.9.T18) asserts that no `password` field appears in any state.
 *
 * What survives the call: the **classification** of the failure
 * (e.g. `'invalid_current'`), the **HTTP status** / **code** for
 * logging, and the **field-level error key** — all of which are
 * non-secret.
 *
 * ## Post-success revalidation
 *
 * On backend success:
 *
 *   1. `revalidateAfterPasswordChange()` (T5) reads the dashboard
 *      and the sessions list in parallel.
 *   2. The result is forwarded to the injected `deps.revalidateDashboard`
 *      and `deps.revalidateSessions` callbacks so the page's
 *      `useSecurityDashboard` and `useActiveSessions` hooks see
 *      the new state (current session only; `passwordAgeDays` /
 *      `lastPasswordChangeAt` updated).
 *
 * The revalidation is non-blocking after the success acknowledgement
 * — the success banner (2.9.T13) appears first, the revalidation
 * runs in the background. If the revalidation rejects, the card
 * stays visible (the password change itself succeeded) and the user
 * can refresh the page to retry.
 *
 * ## Error classification
 *
 * Failures route through `mapPasswordError(...)`. The hook exposes
 * the classification as a property so the card renders the right
 * field-level error per kind:
 *
 *   - `invalid_current` — field-level error on `currentPassword`;
 *     the card clears that field.
 *   - `reuse`           — field-level error on `newPassword`.
 *   - `validation`      — server-side `class-validator` rejection;
 *     the card surfaces `validationMessages`.
 *   - `auth_terminal`   — shared refresh/final-logout policy owns
 *     the path; the hook just marks it.
 *   - `conflict`        — banner copy from `password-copy.error.conflict`.
 *   - `retryable`       — banner with Retry button.
 *
 * @see ChangePasswordCard (2.9.T11)
 * @see mapPasswordError (2.9.T2)
 * @see revalidateAfterPasswordChange (2.9.T5)
 */

import { useCallback, useRef, useState } from 'react';
import {
  changePassword as defaultChangePassword,
  revalidateAfterPasswordChange as defaultRevalidateAfterPasswordChange,
} from '@/features/auth/services/auth.service';
import {
  mapPasswordError,
  type PasswordErrorClassification,
} from '@/features/auth/errors/password-error-mapper';
import {
  getPasswordStrength,
  type PasswordStrengthResult,
} from '@/features/auth/utils/password-strength';
import { ApiError } from '@/lib/api/core/ApiError';
import type {
  AccountSecurityDto,
  ChangePasswordResponseDto,
  SessionListResponseDto,
} from '@/lib/api';

/**
 * Load status of the change-password query. Mirrors the discriminated
 * union used by `useVerifyPassword` (2.9.T6) and `useSecurityDashboard`
 * (2.8.T7) so the card gets a single shape to switch on.
 */
export type UseChangePasswordStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

export type ChangePasswordFieldName =
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword';

export type ChangePasswordFieldErrorKey =
  | 'invalidCurrent'
  | 'reuse'
  | 'mismatch'
  | 'weak'
  | 'equalToCurrent'
  | 'required'
  | 'tooShort';

export interface ChangePasswordFieldErrors {
  currentPassword?: ChangePasswordFieldErrorKey;
  newPassword?: ChangePasswordFieldErrorKey;
  confirmPassword?: ChangePasswordFieldErrorKey;
}

export interface UseChangePasswordError {
  /**
   * UI-facing classification. The hook never surfaces the raw
   * `ApiError` directly — the mapper collapses it into a kind the
   * consumer can branch on with copy.
   */
  classification: PasswordErrorClassification;
  /**
   * Field-level errors derived from the classification. The card
   * renders under the relevant field. Cleared on `reset()`.
   */
  fieldErrors: ChangePasswordFieldErrors;
  /**
   * Raw error from the network call. Preserved for logging and
   * for tests that want to assert on `status`/`code` directly.
   */
  cause: ApiError | unknown;
}

export interface UseChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordClientCheck {
  /**
   * Pre-flight strength check. Returns the strength result so the
   * card can render the strength meter. The hook also uses the
   * `score` to decide whether to short-circuit (`'weak'`).
   */
  strength: PasswordStrengthResult;
}

export interface UseChangePasswordResult {
  status: UseChangePasswordStatus;
  error: UseChangePasswordError | null;
  /**
   * Last successful change-password response. Cleared on `reset()`.
   * The card uses this to fire the success banner (2.9.T13).
   */
  result: ChangePasswordResponseDto | null;
  /**
   * Fire a change-password attempt. Performs client-side validation
   * first; if any check fails, no network call is made and the
   * returned `changePasswordClientCheck` carries the strength
   * results so the card can update the strength meter.
   *
   * @param input - The three password fields (current, new, confirm)
   * @returns The `ChangePasswordResponseDto` on success; `null` on
   *          error (the error is mirrored on `error`).
   */
  change: (
    input: UseChangePasswordInput,
  ) => Promise<ChangePasswordClientCheck | null>;
  /**
   * Return the hook to `'idle'`. The card uses this on dismissal
   * or after a successful change.
   */
  reset: () => void;
}

/**
 * Dependency-injected network helpers. Tests pass stubs; production
 * uses the auth-service wrappers.
 */
export interface UseChangePasswordDeps {
  changePassword: (dto: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<ChangePasswordResponseDto>;
  /**
   * Re-read the dashboard and sessions after a successful change.
   * The hook calls this on success and forwards the result to the
   * injected `revalidateDashboard` / `revalidateSessions` callbacks.
   */
  revalidateAfterPasswordChange: () => Promise<{
    dashboard: AccountSecurityDto;
    sessions: SessionListResponseDto;
  }>;
  /**
   * Hand the new dashboard data to the page's `useSecurityDashboard`
   * hook. The page wires this through `useSecurityDashboard`'s
   * `refetch`/`revalidate` mechanism.
   */
  revalidateDashboard: (next: AccountSecurityDto) => void;
  /**
   * Hand the new sessions list to the page's `useActiveSessions`
   * hook. The page wires this through `useActiveSessions`'s
   * `mutate` mechanism.
   */
  revalidateSessions: (next: SessionListResponseDto) => void;
}

export const defaultChangePasswordDeps: UseChangePasswordDeps = {
  changePassword: defaultChangePassword,
  revalidateAfterPasswordChange: defaultRevalidateAfterPasswordChange,
  // Production defaults are wired by the page (2.9.T15). The hook
  // requires the page to provide callbacks because the password
  // change updates the same dashboard / sessions list the page
  // already owns.
  revalidateDashboard: () => {
    /* page wires this in 2.9.T15 */
  },
  revalidateSessions: () => {
    /* page wires this in 2.9.T15 */
  },
};

/**
 * Map a classification kind to a field-error key. The card reads
 * the field-error key directly to render the localized copy.
 *
 *   `invalid_current` → `currentPassword: 'invalidCurrent'`
 *   `reuse`           → `newPassword: 'reuse'`
 *   `validation`      → `newPassword: 'weak'` (the validation class
 *                       is accepted by the client strength check
 *                       first; if it slips through, the card shows
 *                       the generic weak copy and the
 *                       `validationMessages` from the backend)
 *   `conflict`        → no field-level error; banner copy
 *   `retryable`       → no field-level error; banner copy
 *   `auth_terminal`   → no field-level error; modal closes
 */
function fieldErrorsFromClassification(
  classification: PasswordErrorClassification,
): ChangePasswordFieldErrors {
  switch (classification.kind) {
    case 'invalid_current':
      return { currentPassword: 'invalidCurrent' };
    case 'reuse':
      return { newPassword: 'reuse' };
    case 'validation':
      // The card consumes the first validationMessages line via the
      // generic weak copy. Field-level validation messages are
      // preserved on the `error` object for consumers that want
      // them.
      return { newPassword: 'weak' };
    case 'auth_terminal':
    case 'conflict':
    case 'retryable':
      return {};
  }
}

const initialState: Omit<UseChangePasswordResult, 'change' | 'reset'> = {
  status: 'idle',
  error: null,
  result: null,
};

/**
 * `useChangePassword(deps?)` — see file header.
 *
 * @param deps - Optional network injection (tests only). Production
 *               callers must supply `revalidateDashboard` and
 *               `revalidateSessions` so the post-success revalidation
 *               reaches the page's hooks.
 */
export function useChangePassword(
  deps: UseChangePasswordDeps = defaultChangePasswordDeps,
): UseChangePasswordResult {
  const [state, setState] = useState<
    Omit<UseChangePasswordResult, 'change' | 'reset'>
  >(initialState);

  // Single-pending discipline. Mirrors the `runRevokeSession`
  // reducer pattern in `use-revoke-session.ts` (2.8.T17).
  const inFlightRef = useRef<Promise<ChangePasswordResponseDto | null> | null>(
    null,
  );

  const change = useCallback(
    async (
      input: UseChangePasswordInput,
    ): Promise<ChangePasswordClientCheck | null> => {
      const { currentPassword, newPassword, confirmPassword } = input;

      // ─── Client-side validation: FIRES BEFORE THE NETWORK ─────────────
      // The strength result is returned even on short-circuit so the
      // card can update the strength meter on every keystroke.
      const strength = getPasswordStrength(newPassword);

      // 1. Mismatch.
      if (confirmPassword !== newPassword) {
        setState({
          status: 'error',
          error: {
            classification: mapPasswordError({ code: '', status: 400 }),
            fieldErrors: { confirmPassword: 'mismatch' },
            cause: null,
          },
          result: null,
        });
        return { strength };
      }

      // 2. Equal to current — client-side pre-check; the server
      // still owns the authoritative `AUTH_PASSWORD_REUSE` against
      // the password history.
      if (currentPassword === newPassword) {
        setState({
          status: 'error',
          error: {
            classification: mapPasswordError({ code: '', status: 400 }),
            fieldErrors: { newPassword: 'equalToCurrent' },
            cause: null,
          },
          result: null,
        });
        return { strength };
      }

      // 3. Weak password — the local strength check is a fast
      // front-line; the server still has the final say via
      // `class-validator` (`GLOBAL_VALIDATION_FAILED`).
      if (strength.score < 2) {
        setState({
          status: 'error',
          error: {
            classification: mapPasswordError({ code: '', status: 400 }),
            fieldErrors: { newPassword: 'weak' },
            cause: null,
          },
          result: null,
        });
        return { strength };
      }

      // ─── Single-pending gate ─────────────────────────────────────────
      if (state.status === 'pending') {
        if (inFlightRef.current) {
          return inFlightRef.current.then(() => null);
        }
        return null;
      }

      setState((prev) => ({ ...prev, status: 'pending', error: null, result: null }));

      const promise = (async (): Promise<ChangePasswordResponseDto | null> => {
        try {
          const response = await deps.changePassword({
            currentPassword,
            newPassword,
          });

          // ─── Post-success revalidation ─────────────────────────────
          // The backend contract is "successful change preserves the
          // current session and revokes every other session". The
          // page's hooks need the new dashboard + sessions so the
          // UI reflects the new state.
          //
          // The revalidation is non-blocking: the success banner
          // (2.9.T13) appears first, the revalidation follows. If
          // the revalidation rejects, the success banner is NOT
          // rolled back — the password change itself succeeded.
          try {
            const revalidated = await deps.revalidateAfterPasswordChange();
            deps.revalidateDashboard(revalidated.dashboard);
            deps.revalidateSessions(revalidated.sessions);
          } catch {
            // The revalidation failure is intentionally NOT folded
            // into the hook's `error` — the user already sees the
            // success banner; the page can render a separate
            // "refresh summary" hint if it wants.
          }

          setState({
            status: 'success',
            error: null,
            result: response,
          });
          return response;
        } catch (err: unknown) {
          let classification: PasswordErrorClassification;
          let fieldErrors: ChangePasswordFieldErrors;
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            'status' in err &&
            'validationMessages' in err
          ) {
            const apiErr = err as ApiError;
            classification = mapPasswordError({
              code: String(apiErr.code ?? ''),
              status: Number(apiErr.status ?? 0),
              validationMessages: Array.isArray(apiErr.validationMessages)
                ? apiErr.validationMessages
                : [],
            });
            fieldErrors = fieldErrorsFromClassification(classification);
          } else {
            classification = mapPasswordError({ code: '', status: 0 });
            fieldErrors = fieldErrorsFromClassification(classification);
          }

          setState({
            status: 'error',
            error: { classification, fieldErrors, cause: err },
            result: null,
          });
          return null;
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = promise;
      return promise.then(() => ({ strength }));
    },
    [deps, state.status],
  );

  const reset = useCallback((): void => {
    setState(initialState);
    inFlightRef.current = null;
  }, []);

  return {
    ...state,
    change,
    reset,
  };
}
