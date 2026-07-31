'use client';

/**
 * `useUser` — full user profile state hook.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.4.
 *
 * ## Purpose
 *
 * Exposes `UserMeResponseDto` profile state to the application. This is the
 * full profile payload from `GET /users/me` containing: displayName,
 * avatarUrl, bio, xpTotal, currentStreak, longestStreak, settings, createdAt,
 * updatedAt.
 *
 * For the slim identity (userId, username, email, role, isVerified), use
 * `useAuth()` instead.
 *
 * ## State
 *
 * - `user: UserMeResponseDto | null` — profile when loaded, null when not
 *   yet loaded or during initial fetch.
 * - `isLoading: boolean` — true during initial fetch.
 * - `error: Error | null` — last error encountered (including 5xx which
 *   results in degraded state, not logout).
 *
 * ## Bootstrap Pattern
 *
 * On first authenticated render, call `bootstrapAuth()` to fetch both the
 * identity (`useAuth()`) and the full profile (this hook). The bootstrap
 * orchestration context handles deduplication.
 *
 * ## Error Handling
 *
 * - 5xx errors: Profile enters `degraded` state. Identity remains valid.
 *   A retry button/logic should be offered to the user.
 * - 401 errors: Auth context should handle redirect to login.
 *
 * @see UserMeResponseDto
 * @see useAuth
 */
import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '@/lib/api';
import type { UserMeResponseDto } from '@/features/users/types';
import type { UserControllerMeResult } from '@/lib/api/generated/users/users';

export interface UseUserState {
  user: UserMeResponseDto | null;
  isLoading: boolean;
  isDegraded: boolean; // profile failed but identity valid
  error: Error | null;
}

export interface UseUserActions {
  refetch: () => Promise<void>;
  recoverFromDegraded: () => Promise<void>;
}

export type UseUser = UseUserState & UseUserActions;

/**
 * Fetch the full user profile from `GET /users/me`.
 * Returns `UserMeResponseDto` or throws on error.
 */
async function fetchUserProfile(): Promise<UserMeResponseDto> {
  const result: UserControllerMeResult = await getUsers().userControllerMe();
  if (!result.data) {
    throw new Error('No data returned from /users/me');
  }
  return result.data;
}

const initialState: UseUserState = {
  user: null,
  isLoading: false,
  isDegraded: false,
  error: null,
};

export function useUser(): UseUser {
  const [state, setState] = useState<UseUserState>(initialState);

  const doFetch = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await fetchUserProfile();
      setState({ user, isLoading: false, isDegraded: false, error: null });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch user profile');
      // Profile fetch failed — enter degraded state if identity is still valid
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isDegraded: true,
        error,
      }));
    }
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await doFetch();
  }, [doFetch]);

  // Recover from degraded state by retrying the fetch
  const recoverFromDegraded = useCallback(async (): Promise<void> => {
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
    recoverFromDegraded,
  };
}
