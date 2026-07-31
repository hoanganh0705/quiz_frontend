'use client';

/**
 * `useLogoutAll` — wrap `auth.service.logoutAll()` with modal
 * confirmation discipline.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T20.
 *
 * ## Confirmation discipline
 *
 * Same contract as `useRevokeOtherSessions` (T18):
 *
 *   - `requiresConfirmation` is `true` until the user explicitly
 *     confirms.
 *   - The caller MUST call `logoutAll({ confirmed: true })` from
 *     the modal's confirm button to fire the network request.
 *   - `confirmed: false` (or no args) just enters the modal state.
 *
 * ## Single pending action
 *
 * While `status === 'pending'`, concurrent `logoutAll()` calls are
 * silently dropped (return immediately) so a double-click on the
 * confirm button cannot fire two logout-all requests.
 *
 * ## Finalization discipline
 *
 * The shared finalization (`clearAuthToken` + `clearAllAuthCache`
 * + `LOGGED_OUT` broadcast) lives in `auth.service.logoutAll()`
 * (T6). It is wrapped in `try { ... } finally { ... }`, so it
 * runs on EVERY path — successful `2xx`, thrown `ApiError`
 * (`401`/`5xx`/network), or synchronous throw. The hook does not
 * duplicate any of it; that would cause double-clear and double
 * broadcast, both of which would be visible bugs in cross-tab
 * sync.
 *
 * The backend terminates every session for the user on success.
 * If the backend returns an error, the local session may still be
 * valid server-side; the finalization discipline handles the
 * client side. Either way, the user is routed to `/login`
 * (mirroring `useLogout`'s "Always route to /" invariant —
 * this hook routes to `/login` instead because logout-all
 * invalidates the current session and the user lands on the
 * login surface to re-authenticate on each device).
 *
 * ## `mapSessionError` integration
 *
 * Errors route through `mapSessionError({ target: 'logout-all' })`.
 * The hook does NOT act on `auth_terminal` (the shared refresh
 * policy owns that path); it surfaces `error.classification` for
 * the consumer to render a banner if needed.
 *
 * ## `401` path
 *
 * `/auth/logout-all` is added to the `AUTH_PATHS` skip-list by
 * T22. A final `401` from logout-all therefore rejects directly
 * without firing refresh — the local `finally` discipline in the
 * service still runs finalization (the `finally` block runs on
 * any thrown error, including a 401).
 *
 * @see useLogout (TKT-2.4.B8, same routing discipline)
 * @see useRevokeOtherSessions (2.8.T18, same confirmation discipline)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  logoutAll as defaultLogoutAll,
} from '@/features/auth/service/auth.service';
import {
  mapSessionError,
  type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import { useClearUser } from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import type { AuthControllerLogoutAllResult } from '@/lib/api/generated/auth/auth';

export type UseLogoutAllStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseLogoutAllError {
  classification: SessionErrorClassification;
  cause: ApiError | unknown;
}

export interface LogoutAllArgs {
  /**
   * Required confirmation flag. See file header.
   */
  confirmed: boolean;
}

export interface UseLogoutAllResult {
  /**
   * `true` while the modal is open and no request is in flight.
   * The caller surfaces the modal copy from `revoke.all.*` and
   * only invokes `logoutAll({ confirmed: true })` from the
   * confirm button.
   */
  requiresConfirmation: boolean;
  status: UseLogoutAllStatus;
  error: UseLogoutAllError | null;
  logoutAll: (args?: LogoutAllArgs) => Promise<void>;
  /**
   * Cancel a pending confirmation without firing. Resets the
   * hook back to its `idle` state.
   */
  cancelConfirmation: () => void;
  /**
   * Reset terminal state so the UI can re-attempt.
   */
  reset: () => void;
}

export interface UseLogoutAllDeps {
  logoutAll: () => Promise<AuthControllerLogoutAllResult>;
}

export const defaultLogoutAllDeps: UseLogoutAllDeps = {
  logoutAll: defaultLogoutAll,
};

export function useLogoutAll(
  deps: UseLogoutAllDeps = defaultLogoutAllDeps,
): UseLogoutAllResult {
  const router = useRouter();
  const clearUser = useClearUser();
  const { setAuthenticated } = useAuthState();

  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [status, setStatus] = useState<UseLogoutAllStatus>('idle');
  const [error, setError] = useState<UseLogoutAllError | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const logoutAll = useCallback(
    async (args?: LogoutAllArgs): Promise<void> => {
      const confirmed = args?.confirmed === true;

      // No-confirmation path: just enter the requires-confirmation
      // state. The caller will re-invoke with `{ confirmed: true }`
      // from the modal's confirm button.
      if (!confirmed) {
        setRequiresConfirmation(true);
        setStatus('idle');
        setError(null);
        return;
      }

      // Already pending → dedup.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setRequiresConfirmation(false);
      setStatus('pending');
      setError(null);

      const promise = (async (): Promise<void> => {
        try {
          await deps.logoutAll();

          // Service ran the `finally` block: clearAuthToken,
          // clearAllAuthCache, broadcastLogout. Mirror the React
          // state to match.
          clearUser();
          setAuthenticated(false);
          setStatus('success');

          // Always route to `/login` — every session is invalidated.
          router.push('/login');
        } catch (cause: unknown) {
          // Service's `finally` block still ran on this path; the
          // local cookie/cache is already cleared and the broadcast
          // already fired. We only need to mirror the React state
          // and surface the error.
          clearUser();
          setAuthenticated(false);

          const apiErr = cause instanceof ApiError ? cause : null;
          const classification = mapSessionError({
            code: apiErr?.code ?? 'UNKNOWN',
            status: apiErr?.status ?? 0,
            target: 'logout-all',
          });
          setError({ classification, cause });
          setStatus('error');

          // Route to /login regardless of the backend's response.
          // The `finally` discipline guarantees local cleanup.
          router.push('/login');
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = promise;
      return promise;
    },
    [deps, router, clearUser, setAuthenticated],
  );

  const cancelConfirmation = useCallback((): void => {
    setRequiresConfirmation(false);
    setStatus('idle');
    setError(null);
  }, []);

  const reset = useCallback((): void => {
    setRequiresConfirmation(true);
    setStatus('idle');
    setError(null);
    inFlightRef.current = null;
  }, []);

  return useMemo(
    () => ({
      requiresConfirmation,
      status,
      error,
      logoutAll,
      cancelConfirmation,
      reset,
    }),
    [requiresConfirmation, status, error, logoutAll, cancelConfirmation, reset],
  );
}
