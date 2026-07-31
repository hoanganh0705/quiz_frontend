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

  // ─── Listen for logout events ───────────────────────────────────────────────

  useEffect(() => {
    const handleLogout = () => {
      clearBootstrap();
    };

    // Listen for BroadcastChannel logout events
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('auth');
      channel.addEventListener('message', (event) => {
        if (event.data?.type === 'LOGGED_OUT') {
          handleLogout();
        }
      });

      return () => {
        channel.close();
      };
    }

    // Fallback: listen for auth state change events (cleared)
    const handleAuthStateChange = () => {
      // Check if token is gone
      if (typeof document !== 'undefined') {
        const hasToken = document.cookie.includes('auth_token=');
        if (!hasToken) {
          handleLogout();
        }
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
