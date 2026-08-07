'use client';

/**
 * AuthBootstrapContext — orchestrating context for auth bootstrap.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.5.
 * Phase 2 (Auth identity ownership): TKT-Phase-2.B1.
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
 * ## Phase 2 ownership
 *
 * The bootstrap context is documented as the SINGLE source of truth
 * for the authenticated user (audit P0-3, P0-8, P0-13). The actual
 * runtime ownership is `useAuthSession()` (the cookie + `useUserStore`
 * pair) because `AuthBootstrapProvider` is not mounted in the runtime
 * tree. This provider is preserved so that:
 *
 *   - When mounted, it works as the canonical fetcher.
 *   - The cross-tab listener logic is centralized here (audit P0-3).
 *   - The profile-event subscription is moved out of the store's
 *     module scope (audit P0-9).
 *
 * New code should prefer `useAuthSession()`. Mounting this provider is
 * tracked as a follow-up ticket — the audit describes the migration
 * target, not the current runtime state.
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
// NOTE: `bootstrap-deduplicator` (singleflight) and `token-refresh`
// (sharedBootstrapRefresh) were deleted in the working tree before
// Phase 2 work began (they were unused once the runtime tree stopped
// mounting this provider). The provider is preserved here for
// documentation / future re-mount; the imports below are stubbed so
// the file still typechecks. When the provider is mounted again,
// restore the proper imports.
const singleflight = async <T,>(_key: string, fn: () => Promise<T>): Promise<T> => fn();
const sharedBootstrapRefresh = async (): Promise<void> => {};
import { handleTerminal401 } from '@/features/auth/utils/auth-redirect';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
  subscribeToAuthEvents,
  type AuthEvent,
} from '@/lib/api/core/broadcast-channel';
import {
  subscribeToProfileEvents,
  type ProfileUpdatedEvent,
} from '@/lib/api/core/profile-broadcast-channel';
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
}: AuthBootstrapProviderProps): React.ReactElement {
  const [bootstrapState, setBootstrapState] =
    useState<BootstrapState>('idle');
  const [currentUser, setCurrentUser] =
    useState<CurrentUserResponseDto | null>(null);
  const [user, setUser] = useState<UserMeResponseDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);

  // Stable handles to `doBootstrap` / `clearBootstrap`. The cross-tab
  // listener calls into these via refs so its closure stays fresh
  // without re-subscribing on every render. Audit: P0-3.
  const doBootstrapRef = useRef<() => Promise<void>>(async () => {});
  const clearBootstrapRef = useRef<() => void>(() => {});

  // ─── Bootstrap function ─────────────────────────────────────────────────────

  const doBootstrap = useCallback(async () => {
    const bootstrapKey = 'auth-bootstrap';

    try {
      setBootstrapState('bootstrapping');
      setError(null);
      setProfileError(null);

      try {
        await sharedBootstrapRefresh();
      } catch {
        // Refresh failed — this will likely result in 401, which we handle below
      }

      const [identityResult, profileResult] = await Promise.allSettled([
        singleflight(bootstrapKey + '-identity', async () => {
          const result = await getAuth().authControllerGetCurrentUser();
          if (!result.data) {
            throw new Error('No data returned from /auth/me');
          }
          return result.data;
        }),
        singleflight(bootstrapKey + '-profile', async () => {
          const { getUsers } = await import('@/lib/api');
          const result = await getUsers().userControllerMe();
          if (!result || (result as { userId?: unknown }).userId === undefined) {
            throw new Error('No data returned from /users/me');
          }
          return result as unknown as UserMeResponseDto;
        }),
      ]);

      if (identityResult.status === 'rejected') {
        const identityError =
          identityResult.reason instanceof Error
            ? identityResult.reason
            : new Error('Identity fetch failed');
        throw identityError;
      }

      setCurrentUser(identityResult.value);

      if (profileResult.status === 'rejected') {
        const profError =
          profileResult.reason instanceof Error
            ? profileResult.reason
            : new Error('Profile fetch failed');
        setProfileError(profError);
        setBootstrapState('authenticated');
        return;
      }

      setUser(profileResult.value);
      setBootstrapState('authenticated');
    } catch (err) {
      const caughtError =
        err instanceof Error ? err : new Error('Bootstrap failed');
      setError(caughtError);

      const is401 = isAuthError(caughtError);

      if (is401) {
        clearAllAuthCache();
        handleTerminal401();
        setBootstrapState('unauthenticated');
      } else {
        setBootstrapState('error');
      }
    }
  }, []);

  doBootstrapRef.current = doBootstrap;

  // ─── Error type guard ────────────────────────────────────────────────────────

  function isAuthError(error: Error): boolean {
    if (typeof (error as ApiError).status === 'number') {
      return (error as ApiError).status === 401;
    }
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

  clearBootstrapRef.current = clearBootstrap;

  // ─── Bootstrap on mount ─────────────────────────────────────────────────────
  //
  // Empty deps + the `doBootstrapRef` indirection gives us a stable
  // single-fire effect without the redundant `isFirstMount.current`
  // gate the audit calls out as P0-3.
  useEffect(() => {
    void doBootstrapRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Listen for cross-tab auth events ─────────────────────────────────────
  //
  // Source epic: Epic 2.7.
  // Phase 2 ticket: TKT-Phase-2.B1 (resolves P0-3 — listener uses
  // refs to avoid the stale-closure trap in the original three-effect
  // pattern).
  //
  // Subscribes to BroadcastChannel events from other tabs:
  //   - `LOGGED_OUT`: clear our bootstrap state.
  //   - `LOGGED_IN`:  clear and re-bootstrap (the previous
  //                   `lastBootstrappedUserIdRef` mirror effect was
  //                   the source of P0-3 stale-closure bugs; comparing
  //                   against a derived snapshot inside the listener
  //                   is the fix).
  //   - `TOKEN_REFRESHED`: same user, only the token rotated — no action.
  useEffect(() => {
    const handleAuthEvent = (event: AuthEvent) => {
      switch (event.type) {
        case 'LOGGED_OUT': {
          clearBootstrapRef.current();
          clearVerificationFlags();
          break;
        }

        case 'LOGGED_IN': {
          clearAllAuthCache();
          clearBootstrapRef.current();
          clearVerificationFlags();
          void doBootstrapRef.current();
          break;
        }

        case 'TOKEN_REFRESHED': {
          break;
        }
      }
    };

    const unsubscribe = subscribeToAuthEvents(handleAuthEvent);
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Listen for cross-tab profile mutations ────────────────────────────────
  //
  // Phase 2 ticket: TKT-Phase-2.B2 (resolves P0-9 — listener was
  // previously installed at module-evaluation time, which double-stacks
  // on every Next.js HMR refresh). Mounting the subscription here
  // scopes it to the provider's lifetime and lets React tear it down
  // cleanly on unmount.
  useEffect(() => {
    const handleProfileEvent = (_event: ProfileUpdatedEvent) => {
      void doBootstrapRef.current();
    };

    const unsubscribe = subscribeToProfileEvents(handleProfileEvent);
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Listen for local 'auth-state-change' fallback ────────────────────────
  useEffect(() => {
    const handleAuthStateChange = () => {
      if (typeof document === 'undefined') return;
      const hasToken = document.cookie.includes('auth_token=');
      if (!hasToken) {
        clearBootstrapRef.current();
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange);
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── TKT-6.2.G4 — detach social-list-loaded handlers on logout ────────────
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import('@/lib/social/social-list-loaded-broadcast-channel').then(
      (mod) => {
        if (cancelled) return;
        cleanup = mod.installSocialListLoadedLogoutReset();
      },
    );
    return () => {
      cancelled = true;
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

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