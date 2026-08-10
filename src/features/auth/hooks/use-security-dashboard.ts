'use client';

/**
 * `useSecurityDashboard` — fetches the security summary for `/settings/security`.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T7.
 *
 * ## Purpose
 *
 * Wraps `getSecurityDashboard()` (`GET /auth/security/dashboard`) in a
 * pure React hook that owns:
 *
 *   - the in-flight promise, deduplicated under concurrent callers;
 *   - the load/error/success status state machine;
 *   - mount-safety (no state updates after unmount);
 *   - a manual `refetch()` the UI uses for its Retry button.
 *
 * No automatic retries. A retryable error (network, 429, 5xx) stays
 * `status: 'error'` until the user clicks Retry — that is the US-2.8.1
 * "Partial dashboard/list failure leaves the successful section
 * usable and retryable" contract.
 *
 * ## Mount safety
 *
 * A mount-tracker `useRef` gates every `setState`. Without it, a
 * refetch that resolves after the component unmounts would call
 * `setState` on a stale component (React 18 warning + memory leak).
 * The ref is set to `true` synchronously on mount and to `false` in
 * the cleanup callback, so even StrictMode's double-invocation does
 * not throw away the in-flight promise reference.
 *
 * ## Idempotent refetch
 *
 * Two `refetch()` calls in the same tick share one Promise. The
 * in-flight tracker mirrors the refresh-cooldown deduplication
 * pattern from Epic 2.7 (`src/lib/api/core/refresh-cooldown.ts`) but
 * is local to this hook — there is no cooldown for dashboard reads.
 *
 * @see SessionListResponseDto (sister hook `useActiveSessions`, 2.8.T8)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSecurityDashboard,
} from '@/features/auth/services/auth.service';
import { ApiError } from '@/lib/api/core/ApiError';
import type { AccountSecurityDto } from '@/lib/api';

/**
 * Load status of the dashboard query. Mirrors the discriminated
 * states used by `useLogout` (Epic 2.4) and `useGoogleLogin`
 * (Epic 2.6) so the UI gets a single shape to switch on.
 */
export type SecurityDashboardStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error';

export interface UseSecurityDashboardResult {
  data: AccountSecurityDto | null;
  status: SecurityDashboardStatus;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

const initialState: Omit<UseSecurityDashboardResult, 'refetch'> = {
  data: null,
  status: 'idle',
  error: null,
};

/**
 * Dependency-injected fetcher. Tests pass a stub; production uses
 * the auth-service wrapper.
 */
export interface UseSecurityDashboardDeps {
  fetchSecurityDashboard: () => Promise<AccountSecurityDto>;
}

export const defaultSecurityDashboardDeps: UseSecurityDashboardDeps = {
  fetchSecurityDashboard: getSecurityDashboard,
};

/**
 * `useSecurityDashboard(deps?)` — see file header.
 *
 * @param deps - Optional fetcher injection (tests only)
 */
export function useSecurityDashboard(
  deps: UseSecurityDashboardDeps = defaultSecurityDashboardDeps,
): UseSecurityDashboardResult {
  const [state, setState] = useState<
    Omit<UseSecurityDashboardResult, 'refetch'>
  >(initialState);

  // In-flight tracker. Mirrors the dedup discipline in
  // `refresh-cooldown.ts` (Epic 2.7 / 2.7.T3) and `useLogout`
  // (Epic 2.4 / TKT-2.4.B8). Concurrent callers await the same
  // promise instead of firing duplicate requests.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Mount tracker. Gates `setState` after unmount so the SWR-style
  // late resolve does not produce a "setState on unmounted component"
  // warning. Reset in the cleanup callback.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doFetch = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const data = await deps.fetchSecurityDashboard();
      if (!mountedRef.current) return;
      setState({ data, status: 'success', error: null });
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const error =
        err && typeof err === 'object' && 'code' in err && 'status' in err
          ? (err as ApiError)
          : null;
      setState({
        data: null,
        status: 'error',
        error,
      });
    }
  }, [deps]);

  const refetch = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const promise = doFetch().finally(() => {
      // Always drop the in-flight reference on settle so a fresh
      // call can fire after this one resolves. Mirrors the
      // `inFlightRefresh = null` discipline in `custom-instance.ts`.
      inFlightRef.current = null;
    });

    inFlightRef.current = promise;
    return promise;
  }, [doFetch]);

  // Initial fetch on first mount. We intentionally do NOT depend on
  // `doFetch` — this is a mount-once behaviour. Subsequent reloads
  // come from `refetch()`.
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    refetch,
  };
}
