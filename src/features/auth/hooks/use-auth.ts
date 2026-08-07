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
 *
 * ## Envelope-unwrap contract
 *
 * The Axios response interceptor in `lib/api/core/custom-instance.ts`
 * unwraps the backend's `{ data, meta }` envelope (`response.data =
 * unwrapEnvelope(response.data)`) BEFORE the SDK return value reaches
 * this function. That means `result` is already the **inner** payload
 * (`CurrentUserResponseDto`-shaped), NOT the wrapped envelope.
 *
 * Earlier revisions mistakenly read `result.data`, which returned
 * `undefined` at runtime (the inner payload has no `data` field) and
 * silently broke every consumer of `useAuth().currentUser`. Returning
 * the unwrapped `result` directly restores the contract.
 *
 * @see features/users/services/users.reads.service.ts — same fix.
 */
async function fetchCurrentUserIdentity(): Promise<CurrentUserResponseDto> {
  const result =
    await getAuth().authControllerGetCurrentUser();
  // Cast via `unknown`: the generated `AuthControllerGetCurrentUser200`
  // declares the *wrapped* shape, but the runtime value is the
  // unwrapped inner `CurrentUserResponseDto`. The transport boundary
  // is the only place where this cast lives.
  return result as unknown as CurrentUserResponseDto;
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
