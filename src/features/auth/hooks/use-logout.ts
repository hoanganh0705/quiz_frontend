'use client';

/**
 * `useLogout` — logout state machine.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.B8 (initial), TKT-2.4.C3 (refinement).
 *
 * ## State machine
 *
 *   idle → pending → success | server_unconfirmed
 *
 * `server_unconfirmed` means the local cleanup happened (the `finally`
 * discipline in `auth.service.logout`) but the backend did not
 * acknowledge. The user is still routed to `/` in both cases.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClearUser } from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { mapLogoutError, type LogoutErrorKind } from '@/features/auth/errors/login-error-mapper';
import { logout as defaultLogout } from '@/features/auth/services/auth.service';
import type { AuthControllerLogoutResult } from '@/lib/api/generated/auth/auth';

export type UseLogoutState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'server_unconfirmed'; errorKind: LogoutErrorKind };

export interface UseLogout {
  state: UseLogoutState;
  logout: () => Promise<void>;
  reset: () => void;
}

const initialState: UseLogoutState = { status: 'idle' };

export interface UseLogoutDeps {
  logout: () => Promise<AuthControllerLogoutResult>;
}

export const defaultLogoutDeps: UseLogoutDeps = {
  logout: defaultLogout,
};

export function useLogout(
  deps: UseLogoutDeps = defaultLogoutDeps
): UseLogout {
  const [state, setState] = useState<UseLogoutState>(initialState);
  const router = useRouter();
  const clearUser = useClearUser();
  const { setAuthenticated } = useAuthState();
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    return () => {
      inFlightRef.current = null;
    };
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setState({ status: 'pending' });

    const promise = (async () => {
      let rawError: unknown;
      try {
        await deps.logout();
      } catch (err: unknown) {
        rawError = err;
      }

      // The service's `finally` block already ran and cleared the token.
      // We only need to update React state and route.
      clearUser();
      setAuthenticated(false);

      const mapped = mapLogoutError(rawError);
      if (mapped.kind === 'ok') {
        setState({ status: 'success' });
      } else {
        setState({ status: 'server_unconfirmed', errorKind: mapped.kind });
      }

      // Always route to `/` regardless of the backend's response.
      // The `finally` discipline guarantees local cleanup happened.
      router.push('/');
    })();

    inFlightRef.current = promise;
    return promise;
  }, [deps, router, clearUser, setAuthenticated]);

  const reset = useCallback(() => {
    inFlightRef.current = null;
    setState(initialState);
  }, []);

  return { state, logout, reset };
}
