/**
 * `useUserQuizAnalytics` — creator-side quiz analytics for a user.
 *
 * Source epic:   Phase 1 (F-18) — public profile /profile/[name] quick-win.
 * Source ticket: F-18.
 *
 * Source of truth: `GET /api/v1/users/{userId}/quizzes/analytics` (the
 * per-user creator-analytics endpoint). Wraps the verified service
 * wrapper `getUserQuizAnalytics` from `users.profile.service.ts`.
 *
 * ## Self-only contract
 *
 * The backend's `userControllerGetUserQuizAnalytics` rejects calls
 * for any `userId` that isn't the authenticated user with a 404. The
 * hook preserves that contract by returning `{ analytics: null, ... }`
 * when `userId !== currentUserId` — the public profile page renders
 * the empty state instead of an error.
 *
 * ## SWR key
 *
 * The key is `['users', 'userId', 'quiz-analytics']` so that:
 *   - The cache is keyed per userId (no cross-user leakage).
 *   - A null userId short-circuits to the safe fallback without
 *     dispatching a fetch.
 */
'use client';

import useSWR from 'swr';

import { getUserQuizAnalytics, type CreatorQuizAnalytics } from '@/features/users/services/users.profile.service';
import { useUser } from '@/features/users/store/user-store';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

export interface UseUserQuizAnalyticsResult {
  analytics: CreatorQuizAnalytics | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  /**
   * `true` when the viewer is authorised to see this user's
   * analytics (i.e. the viewer IS the target). The public profile
   * page renders the empty state when this is `false` because the
   * backend will 404.
   */
  isSelf: boolean;
}

const EMPTY: UseUserQuizAnalyticsResult = Object.freeze({
  analytics: null,
  isLoading: false,
  isStale: false,
  error: null,
  isSelf: false,
});

/**
 * Read creator-side quiz analytics for `userId`.
 *
 * Returns `{ analytics: null, isSelf: false, ... }` when:
 *   - `userId` is null/undefined (target unknown),
 *   - the viewer is unauthenticated,
 *   - the viewer is not the target user (backend will 404).
 */
export function useUserQuizAnalytics(
  userId: string | null,
): UseUserQuizAnalyticsResult {
  const auth = useAuthSession();
  const viewerId = auth.currentUser?.userId ?? null;
  const isAuthenticated = auth.isAuthenticated;
  const userStore = useUser();
  const viewerStoreId = userStore?.userId ?? null;

  const isSelf =
    userId !== null &&
    ((viewerId !== null && viewerId === userId) ||
      (viewerStoreId !== null && viewerStoreId === userId));

  const swr = useSWR<CreatorQuizAnalytics | null>(
    isAuthenticated && isSelf && userId
      ? (['users', userId, 'quiz-analytics'] as const)
      : null,
    () => getUserQuizAnalytics(userId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  if (!isAuthenticated) return EMPTY;
  if (userId === null) return EMPTY;
  if (!isSelf) return { ...EMPTY, isSelf: false };

  return {
    analytics: swr.data ?? null,
    isLoading: swr.isLoading,
    isStale: Boolean(swr.isValidating && swr.data),
    error: swr.error ?? null,
    isSelf: true,
  };
}
