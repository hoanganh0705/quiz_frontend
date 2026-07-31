'use client';

/**
 * AuthBootstrapContext — orchestrating context for auth bootstrap.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.5.
 *
 * ## Purpose
 *
 * Manages the deduplicated bootstrap state covering both identity validation
 * (`/auth/me`) and profile hydration (`/users/me`) on first authenticated
 * render. This ensures:
 *
 * 1. Multiple simultaneous consumers share a single bootstrap request
 * 2. State transitions are coordinated (idle → bootstrapping → authenticated/error)
 * 3. Logout signals propagate to clear bootstrap state
 *
 * ## Bootstrap State Machine
 *
 * ```
 * idle → bootstrapping → authenticated
 *                  ↓
 *              unauthenticated
 *                  ↓
 *               error
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * // Wrap your app with this provider
 * <AuthBootstrapProvider>
 *   {children}
 * </AuthBootstrapProvider>
 *
 * // In any component
 * const { bootstrapState, isBootstrapping, currentUser, user, refetch } = useAuthBootstrap();
 * ```
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAuth } from '@/lib/api';
import { singleflight } from '@/features/auth/utils/bootstrap-deduplicator';
import { sharedBootstrapRefresh } from '@/features/auth/utils/token-refresh';
import { handleTerminal401 } from '@/features/auth/utils/auth-redirect';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
  subscribeToAuthEvents,
  type AuthEvent,
} from '@/lib/api/core/broadcast-channel';
import type { CurrentUserResponseDto } from '@/features/auth/types';
import type { UserMeResponseDto } from '@/features/users/types';
import type { ApiError } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BootstrapState =
  | 'idle'
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface BootstrapData {
  currentUser: CurrentUserResponseDto;
  user: UserMeResponseDto;
}

export interface AuthBootstrapValue {
  // State
  bootstrapState: BootstrapState;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  isDegraded: boolean; // profile failed but identity valid

  // Data
  currentUser: CurrentUserResponseDto | null;
  user: UserMeResponseDto | null;

  // Error
  error: Error | null;
  profileError: Error | null; // separate error for profile vs identity

  // Actions
  refetch: () => Promise<void>;
  clearBootstrap: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthBootstrapContext = createContext<AuthBootstrapValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthBootstrapProviderProps {
  children: ReactNode;
}

export function AuthBootstrapProvider({
  children,
}: AuthBootstrapProviderProps): JSX.Element {
  const [bootstrapState, setBootstrapState] =
    useState<BootstrapState>('idle');
  const [currentUser, setCurrentUser] =
    useState<CurrentUserResponseDto | null>(null);
  const [user, setUser] = useState<UserMeResponseDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);

  // Track if this is the first mount to trigger bootstrap
  const isFirstMount = useRef(true);

  // Track the userId of the last successful bootstrap. The cross-tab
  // LOGGED_IN listener (Epic 2.7, Ticket 2.7.T16) compares incoming
  // userIds against this to avoid double-bootstrapping the same user.
  const lastBootstrappedUserIdRef = useRef<string | null>(null);

  // ─── Bootstrap function ─────────────────────────────────────────────────────

  const doBootstrap = useCallback(async () => {
    // Use singleflight to deduplicate concurrent bootstrap requests
    const bootstrapKey = 'auth-bootstrap';

    try {
      setBootstrapState('bootstrapping');
      setError(null);
      setProfileError(null);

      // Refresh token before bootstrap (uses shared refresh with deduplication)
      // This ensures we have a valid token before calling /auth/me and /users/me
      try {
        await sharedBootstrapRefresh();
      } catch {
        // Refresh failed — this will likely result in 401, which we handle below
      }

      // Fetch both identity and profile in parallel using singleflight
      const [identityResult, profileResult] = await Promise.allSettled([
        singleflight(bootstrapKey + '-identity', async () => {
          const result = await getAuth().authControllerGetCurrentUser();
          if (!result.data) {
            throw new Error('No data returned from /auth/me');
          }
          return result.data;
        }),
        singleflight(bootstrapKey + '-profile', async () => {
          // Dynamically import to avoid circular dependencies
          const { getUsers } = await import('@/lib/api');
          const result = await getUsers().userControllerMe();
          if (!result.data) {
            throw new Error('No data returned from /users/me');
          }
          return result.data;
        }),
      ]);

      // Check identity result
      if (identityResult.status === 'rejected') {
        const identityError =
          identityResult.reason instanceof Error
            ? identityResult.reason
            : new Error('Identity fetch failed');
        throw identityError;
      }

      // Identity succeeded
      setCurrentUser(identityResult.value);

      // Check profile result
      if (profileResult.status === 'rejected') {
        const profError =
          profileResult.reason instanceof Error
            ? profileResult.reason
            : new Error('Profile fetch failed');
        // Profile failed but identity is valid — enter degraded state
        setProfileError(profError);
        setBootstrapState('authenticated');
        return;
      }

      // Both succeeded
      setUser(profileResult.value);
      setBootstrapState('authenticated');
    } catch (err) {
      const caughtError =
        err instanceof Error ? err : new Error('Bootstrap failed');
      setError(caughtError);

      // Determine if this is an auth error (401) or a server error
      // Check for 401 status using ApiError structure
      const is401 = isAuthError(caughtError);

      if (is401) {
        // Terminal 401: clear cache and redirect to login
        clearAllAuthCache();
        handleTerminal401();
        setBootstrapState('unauthenticated');
      } else {
        setBootstrapState('error');
      }
    }
  }, []);

  // ─── Error type guard ────────────────────────────────────────────────────────

  function isAuthError(error: Error): boolean {
    // Check for ApiError with 401 status
    if (typeof (error as ApiError).status === 'number') {
      return (error as ApiError).status === 401;
    }
    // Fallback: check error message
    return (
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('unauthorized')
    );
  }

  // ─── Refetch function ───────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    await doBootstrap();
  }, [doBootstrap]);

  // ─── Clear bootstrap ────────────────────────────────────────────────────────

  const clearBootstrap = useCallback(() => {
    setBootstrapState('idle');
    setCurrentUser(null);
    setUser(null);
    setError(null);
    setProfileError(null);
  }, []);

  // ─── Bootstrap on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      doBootstrap();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Listen for cross-tab auth events ─────────────────────────────────────
  //
  // Source epic: Epic 2.7 — Access-token refresh and cross-tab session sync.
  // Source tickets: 2.7.T12, 2.7.T15, 2.7.T16.
  //
  // Subscribes to BroadcastChannel events from other tabs:
  //
  //   - `LOGGED_OUT`: another tab logged out — clear our bootstrap state.
  //   - `LOGGED_IN`:  another tab logged in — if it's the same user we
  //                   already know about, do nothing (avoid double bootstrap).
  //                   If it's a different user, clear our state and
  //                   bootstrap the new user.
  //   - `TOKEN_REFRESHED`: same user, only the token rotated — no action.

  useEffect(() => {
    const handleAuthEvent = (event: AuthEvent) => {
      switch (event.type) {
        case 'LOGGED_OUT': {
          // Another tab logged out — clear our state in lockstep.
          clearBootstrap();
          lastBootstrappedUserIdRef.current = null;

          // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently
          // verified" flags. A logout broadcast from a sibling tab
          // means the local session is now unauthenticated; any
          // pending verification must not survive the auth change.
          clearVerificationFlags();
          break;
        }

        case 'LOGGED_IN': {
          // Same user who is already bootstrapped here? Nothing to do.
          // This is the common case when opening multiple tabs as the
          // same logged-in user.
          if (
            lastBootstrappedUserIdRef.current !== null &&
            lastBootstrappedUserIdRef.current === event.userId
          ) {
            return;
          }

          // Different user (or no prior bootstrap) — clear the stale state
          // and trigger a fresh bootstrap for the new user. The cookie
          // has already been updated by the other tab (via the LOGGED_IN
          // handler in custom-instance), so the next request carries the
          // new token.
          clearAllAuthCache();
          clearBootstrap();

          // Epic 2.9 / 2.9.T10 — wipe any in-memory "recently
          // verified" flags. The prior session's verification must
          // not carry over to the new user. Even when the userId
          // matches (a re-login path), the local-tab flag was set
          // by THIS tab's verify-password call and is not tied to
          // the broadcast-tab's credential, so it must not survive
          // a fresh login.
          clearVerificationFlags();

          lastBootstrappedUserIdRef.current = event.userId;
          doBootstrap();
          break;
        }

        case 'TOKEN_REFRESHED': {
          // A new access token arrived from another tab. We do not need
          // to re-bootstrap because the user identity is unchanged —
          // only the credential rotated. Custom-instance already updates
          // its in-memory token when it receives the event.
          break;
        }
      }
    };

    // Subscribe via the broadcast channel manager
    const unsubscribe = subscribeToAuthEvents(handleAuthEvent);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };

    // `clearBootstrap`, `doBootstrap`, and `clearAllAuthCache` are stable
    // callbacks / module imports, so the empty deps are correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture the bootstrapped userId into the ref so the cross-tab listener
  // (registered above) can detect "same user" vs "different user" without
  // re-rendering every time the bootstrap completes.
  useEffect(() => {
    if (bootstrapState === 'authenticated' && currentUser) {
      const id = (currentUser as { id?: string; userId?: string }).id
        ?? (currentUser as { userId?: string }).userId;
      if (id && id !== lastBootstrappedUserIdRef.current) {
        lastBootstrappedUserIdRef.current = id;
      }
    } else if (bootstrapState === 'unauthenticated' || bootstrapState === 'idle') {
      lastBootstrappedUserIdRef.current = null;
    }
  }, [bootstrapState, currentUser]);

  // ─── Listen for local 'storage' + 'auth-state-change' fallbacks ───────────
  //
  // When BroadcastChannel is unavailable, fall back to the storage sync
  // mechanism via the existing `auth-state-change` DOM event (dispatched
  // by `clearAuthToken` in auth-cookies.ts).

  useEffect(() => {
    const handleAuthStateChange = () => {
      if (typeof document === 'undefined') return;
      const hasToken = document.cookie.includes('auth_token=');
      if (!hasToken) {
        clearBootstrap();
        lastBootstrappedUserIdRef.current = null;
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange);
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange);
    };
  }, [clearBootstrap]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const value = useMemo<AuthBootstrapValue>(
    () => ({
      bootstrapState,
      isBootstrapping: bootstrapState === 'bootstrapping',
      isAuthenticated:
        bootstrapState === 'authenticated' || bootstrapState === 'bootstrapping',
      isDegraded: bootstrapState === 'authenticated' && profileError !== null,
      currentUser,
      user,
      error,
      profileError,
      refetch,
      clearBootstrap,
    }),
    [
      bootstrapState,
      currentUser,
      user,
      error,
      profileError,
      refetch,
      clearBootstrap,
    ]
  );

  return (
    <AuthBootstrapContext.Provider value={value}>
      {children}
    </AuthBootstrapContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access auth bootstrap state.
 *
 * @throws Error if used outside of AuthBootstrapProvider
 */
export function useAuthBootstrap(): AuthBootstrapValue {
  const context = useContext(AuthBootstrapContext);
  if (context === null) {
    throw new Error(
      'useAuthBootstrap must be used within an AuthBootstrapProvider'
    );
  }
  return context;
}
