'use client';

/**
 * `useAuth` — slim identity state hook.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.3.
 *
 * ## Purpose
 *
 * Exposes `CurrentUserResponseDto` identity state to the application. This is
 * the slim identity payload from `GET /auth/me` containing only: userId,
 * username, email, role, and isVerified.
 *
 * For the full profile (displayName, avatarUrl, bio, XP, streaks, settings),
 * use `useUser()` instead.
 *
 * ## State
 *
 * - `currentUser: CurrentUserResponseDto | null` — identity when authenticated,
 *   null when unauthenticated or loading.
 * - `isLoading: boolean` — true during initial fetch.
 * - `error: Error | null` — last error encountered.
 * - `refetch: () => Promise<void>` — re-fetches the identity.
 *
 * ## Bootstrap Pattern
 *
 * On first authenticated render, call `bootstrapAuth()` to fetch both the
 * identity (this hook) and the full profile (`useUser()`). The bootstrap
 * orchestration context handles deduplication and ensures both requests share
 * the same token-refresh path.
 *
 * @see CurrentUserResponseDto
 * @see useUser
 */
import { useCallback, useEffect, useState } from 'react';
import { getAuth } from '@/lib/api';
import type { CurrentUserResponseDto } from '@/features/auth/types';
import type { AuthControllerGetCurrentUserResult } from '@/lib/api/generated/auth/auth';

export interface UseAuthState {
  currentUser: CurrentUserResponseDto | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseAuthActions {
  refetch: () => Promise<void>;
}

export type UseAuth = UseAuthState & UseAuthActions;

/**
 * Fetch the current user identity from `GET /auth/me`.
 * Returns `CurrentUserResponseDto` or throws on error.
 */
async function fetchCurrentUserIdentity(): Promise<CurrentUserResponseDto> {
  const result: AuthControllerGetCurrentUserResult =
    await getAuth().authControllerGetCurrentUser();
  if (!result.data) {
    throw new Error('No data returned from /auth/me');
  }
  return result.data;
}

const initialState: UseAuthState = {
  currentUser: null,
  isLoading: false,
  error: null,
};

export function useAuth(): UseAuth {
  const [state, setState] = useState<UseAuthState>(initialState);

  const doFetch = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const currentUser = await fetchCurrentUserIdentity();
      setState({ currentUser, isLoading: false, error: null });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch current user');
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await doFetch();
  }, [doFetch]);

  // Auto-fetch on mount
  useEffect(() => {
    doFetch();
    // Intentionally empty deps — we want a single fetch on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    refetch,
  };
}
