/**
 * `useMyProfile` — read-side profile hook with cross-tab revalidation.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.B3.
 *
 * ## What this hook owns
 *
 * A form-ready profile read from the Zustand store (`useUserStore`) with:
 *
 *   1. `profile: UserMeResponseDto | null` — the authenticated user's profile,
 *      derived from `useUserStore().user`.
 *   2. `isLoading: boolean` — `true` while the initial fetch is in flight.
 *   3. `isHydrated: boolean` — `true` once `profile !== null`. The hydration
 *      state gates form rendering so forms never receive `null` on first render.
 *   4. `refetch(): Promise<UserMeResponseDto | null>` — forces a server
 *      re-fetch via `useFetchCurrentUser()`.
 *   5. Cross-tab listener: subscribes to `ProfileUpdatedEvent` from other tabs
 *      and calls `refetch()` when a profile or settings mutation lands in another tab.
 *
 * ## Cross-tab revalidation
 *
 * The hook subscribes to `ProfileUpdatedEvent` (from
 * `profile-broadcast-channel.ts`) on mount and unsubscribes on unmount.
 * When an event arrives from another tab (`tabId` differs), `refetch()` is called
 * to pull the latest profile from the server.
 *
 * The same-tab event is filtered out by the `profile-broadcast-channel.ts`
 * layer using the `tabId` in the message. The hook does NOT need to
 * filter — it just calls `refetch()` on every received event.
 *
 * ## Diff from `useUser` (Phase 2.5)
 *
 * `useUser()` (in `hooks/use-user.ts`) creates its own SWR-like state machine
 * and fetches `GET /users/me` on mount. This hook reads from the Zustand
 * store (`useUserStore`) which is the authoritative Phase 2 bootstrap store.
 * If the store has a user, this hook is immediately hydrated. If not, it
 * returns `null` until the store is populated (by the auth bootstrap flow).
 *
 * `useMyProfile` does NOT auto-fetch on mount — it relies on the Phase 2
 * auth bootstrap (`bootstrapAuth` in `use-auth.ts`) to populate the store
 * before this hook is called. The `refetch()` call is for explicit
 * cross-tab revalidation only.
 *
 * @see useUser (Phase 2.5) — SWR-like profile fetcher; do NOT use in Epic 4.3
 *      forms because it creates duplicate in-flight requests.
 * @see useUserStore (Phase 2) — the authoritative Zustand store.
 * @see profile-broadcast-channel.ts — cross-tab event envelope.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';

import {
  subscribeToProfileEvents,
  type ProfileUpdatedEvent,
} from '@/lib/api/core/profile-broadcast-channel';
import {
  useUserStore,
} from '@/features/users/store/user-store';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

// ─── Public types ───────────────────────────────────────────────────────────────

export interface UseMyProfileReturn {
  /**
   * The authenticated user's profile. `null` before hydration.
   */
  profile: UserMeResponseDto | null;
  /**
   * `true` while the initial store population is in flight.
   * Mirrors `useUserStore().isLoading`.
   */
  isLoading: boolean;
  /**
   * `true` once `profile !== null`. Use this as the hydration gate —
   * render a skeleton while `isHydrated === false`.
   */
  isHydrated: boolean;
  /**
   * `true` if the profile fetch failed. Mirrors `useUserStore().error`.
   */
  error: string | null;
  /**
   * Force a server re-fetch. Calls `useFetchCurrentUser()` to refresh
   * the Zustand store from `GET /users/me`.
   * Returns the refreshed `UserMeResponseDto` or `null` on failure.
   *
   * Called automatically when a cross-tab `profile/updated` event arrives.
   */
  refetch: () => Promise<UserMeResponseDto | null>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Read-side profile hook with cross-tab revalidation.
 *
 * @example
 * ```tsx
 * function EditProfilePage() {
 *   const { profile, isHydrated, isLoading } = useMyProfile();
 *
 *   if (!isHydrated) return <ProfileSkeleton />;
 *
 *   return <EditProfileForm profile={profile} />;
 * }
 * ```
 */
export function useMyProfile(): UseMyProfileReturn {
  const profile = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);
  const error = useUserStore((s) => s.error);
  const fetchCurrentUser = useUserStore((s) => s.fetchCurrentUser);

  const isHydrated = profile !== null;

  // P2-83: dropped the `isMountedRef` guard. The Zustand store
  // ignores writes after unmount, and `fetchCurrentUser` returns
  // a `Promise` that the caller can `await` — the early return
  // guarded against a race that no longer exists given the
  // authoritative store.

  // Refetch the profile from the server.
  const refetch = useCallback(async (): Promise<UserMeResponseDto | null> => {
    const result = await fetchCurrentUser();
    return result ?? null;
  }, [fetchCurrentUser]);

  // Subscribe to cross-tab profile mutation events.
  useEffect(() => {
    const handler = (event: ProfileUpdatedEvent) => {
      // Only revalidate if the event matches our user.
      if (!profile || event.userId !== profile.userId) return;
      // Ignore our own events (same-tab suppression is done by the channel layer).
      void refetch();
    };

    const unsubscribe = subscribeToProfileEvents(handler);

    return () => {
      unsubscribe();
    };
  }, [profile, refetch]);

  return useMemo<UseMyProfileReturn>(
    () => ({
      profile,
      isLoading,
      isHydrated,
      error,
      refetch,
    }),
    [profile, isLoading, isHydrated, error, refetch],
  );
}
