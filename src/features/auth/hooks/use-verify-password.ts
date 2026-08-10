'use client';

/**
 * `useVerifyPassword` — one-shot password verification hook.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T6.
 *
 * ## Purpose
 *
 * Wraps `verifyPassword()` (`POST /auth/verify-password`) in a React
 * hook that owns:
 *
 *   - the in-flight request lifecycle,
 *   - single-pending action discipline (the second concurrent call is
 *     dropped),
 *   - server-side error classification through `mapPasswordError()`,
 *   - a manual `reset()` the modal uses on dismissal.
 *
 * Verification proves password knowledge but does NOT change auth
 * state. The hook never touches cookies, broadcasts, or cache.
 *
 * ## Single pending action
 *
 * While `status === 'pending'`, a second `verify()` call returns
 * immediately. The double-click on the Continue button cannot fire
 * two network requests. This mirrors the discipline in
 * `useRevokeSession` (2.8.T17) and `useLogoutAll` (2.8.T20).
 *
 * ## Password hygiene
 *
 * The hook does not store `password` in state, refs, or module-level
 * closures. `verify(password)` forwards the value to the SDK call
 * synchronously and lets the function-local reference go out of
 * scope. The reducer simulation used in the unit suite (2.9.T17)
 * asserts that no `password` field appears in any state slot.
 *
 * ## Error classification
 *
 * Failures route through `mapPasswordError(...)`. The hook exposes
 * the classification as a property so the modal renders the field-
 * level banner per kind (not the raw `code`/`status`):
 *
 *   - `invalid_current` — field-level error on the password field;
 *     the modal clears the field.
 *   - `validation`     — backend `class-validator` failure; the
 *     modal surfaces `validationMessages`.
 *   - `auth_terminal`  — shared refresh/final-logout policy owns the
 *     path; the hook just marks it.
 *   - `conflict`       — banner copy from `password-copy.error.conflict`.
 *   - `retryable`      — banner with Retry button.
 *
 * The verification response is `{ valid: boolean }`. On
 * `valid: false`, the backend returns `2xx` with `valid: false` —
 * the hook does NOT classify this as an error. The modal reads the
 * `valid` flag and renders the field-level "Current password is
 * incorrect" copy. (The map is reserved for transport errors.)
 *
 * @see VerifyPasswordModal (2.9.T9)
 * @see mapPasswordError (2.9.T2)
 */

import { useCallback, useRef, useState } from 'react';
import {
  verifyPassword as defaultVerifyPassword,
} from '@/features/auth/services/auth.service';
import {
  mapPasswordError,
  type PasswordErrorClassification,
} from '@/features/auth/errors/password-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { VerifyPasswordResponseDto } from '@/lib/api';

/**
 * Load status of the verify-password query. Mirrors the discriminated
 * union used by `useSecurityDashboard` (2.8.T7) and `useLogout`
 * (Epic 2.4) so the modal gets a single shape to switch on.
 */
export type UseVerifyPasswordStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseVerifyPasswordError {
  /**
   * UI-facing classification. The hook never surfaces the raw
   * `ApiError` directly — the mapper collapses it into a kind the
   * consumer can branch on with copy.
   */
  classification: PasswordErrorClassification;
  /**
   * Raw error from the network call. Preserved for logging and
   * for tests that want to assert on `status`/`code` directly.
   */
  cause: ApiError | unknown;
}

export interface UseVerifyPasswordResult {
  status: UseVerifyPasswordStatus;
  error: UseVerifyPasswordError | null;
  /**
   * Last successful verification response. Cleared on `reset()` and
   * on the next `verify()` call. The modal reads `result?.valid`
   * to branch on success vs. wrong-password.
   */
  result: VerifyPasswordResponseDto | null;
  /**
   * Fire a verification call. The `password` value is forwarded to
   * the SDK synchronously and is NOT stored in hook state.
   *
   * @param password - The user's current password (typed into the modal)
   * @returns The `VerifyPasswordResponseDto` on success; `null` on
   *          error (the error is mirrored on `error`).
   */
  verify: (password: string) => Promise<VerifyPasswordResponseDto | null>;
  /**
   * Return the hook to `'idle'`. The modal uses this on dismissal
   * so the next time it opens, the state is fresh.
   */
  reset: () => void;
}

/**
 * Dependency-injected fetcher. Tests pass a stub; production uses
 * the auth-service wrapper.
 */
export interface UseVerifyPasswordDeps {
  verifyPassword: (dto: { password: string }) => Promise<VerifyPasswordResponseDto>;
}

export const defaultVerifyPasswordDeps: UseVerifyPasswordDeps = {
  verifyPassword: defaultVerifyPassword,
};

/**
 * Build the same shape the mapper produces, from anything that
 * looks like an `ApiError`. Pure function; no `instanceof` check so
 * unit tests can pass synthetic shapes.
 */
function toPasswordError(
  cause: unknown,
): UseVerifyPasswordError {
  if (
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    'status' in cause &&
    'validationMessages' in cause
  ) {
    const apiErr = cause as ApiError;
    return {
      classification: mapPasswordError({
        code: String(apiErr.code ?? ''),
        status: Number(apiErr.status ?? 0),
        validationMessages: Array.isArray(apiErr.validationMessages)
          ? apiErr.validationMessages
          : [],
      }),
      cause: apiErr,
    };
  }
  // Unknown shape — fall back to a `'retryable'` classification,
  // mirroring the conservatively-permissive fallback in
  // `mapPasswordError`.
  return {
    classification: mapPasswordError({
      code: '',
      status: 0,
    }),
    cause,
  };
}

const initialState: Omit<UseVerifyPasswordResult, 'verify' | 'reset'> = {
  status: 'idle',
  error: null,
  result: null,
};

/**
 * `useVerifyPassword(deps?)` — see file header.
 *
 * @param deps - Optional fetcher injection (tests only)
 */
export function useVerifyPassword(
  deps: UseVerifyPasswordDeps = defaultVerifyPasswordDeps,
): UseVerifyPasswordResult {
  const [state, setState] = useState<
    Omit<UseVerifyPasswordResult, 'verify' | 'reset'>
  >(initialState);

  // Single-pending discipline. Mirrors the `runRevokeSession`
  // reducer pattern in `use-revoke-session.ts` (2.8.T17) and
  // `use-logout-all.ts` (2.8.T20).
  const inFlightRef = useRef<Promise<VerifyPasswordResponseDto | null> | null>(
    null,
  );

  const verify = useCallback(
    async (password: string): Promise<VerifyPasswordResponseDto | null> => {
      // Password hygiene: do NOT store the password in any state slot.
      // The argument goes out of scope when this function returns.
      if (state.status === 'pending') {
        // Drop the second concurrent call. The in-flight tracker
        // already records the first request; we return its promise
        // so the caller still sees the resolution.
        if (inFlightRef.current) {
          return inFlightRef.current;
        }
        return null;
      }

      setState((prev) => ({ ...prev, status: 'pending', error: null, result: null }));

      const promise = (async (): Promise<VerifyPasswordResponseDto | null> => {
        try {
          const response = await deps.verifyPassword({ password });
          // `valid: false` is a 2xx response — NOT classified as
          // an error. The modal renders the field-level copy when
          // the user sees the password stays incorrect.
          setState({
            status: 'success',
            error: null,
            result: response,
          });
          return response;
        } catch (err: unknown) {
          const error = toPasswordError(err);
          setState({
            status: 'error',
            error,
            result: null,
          });
          return null;
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = promise;
      return promise;
    },
    [deps, state.status],
  );

  const reset = useCallback((): void => {
    setState(initialState);
    inFlightRef.current = null;
  }, []);

  return {
    ...state,
    verify,
    reset,
  };
}
