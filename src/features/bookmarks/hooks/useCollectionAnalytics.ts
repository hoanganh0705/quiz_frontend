/**
 * `useCollectionAnalytics.ts` — fetches analytics data for a collection.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B2-4.
 *
 * ## What this hook owns
 *
 *   - Fetches analytics data for a specific collection.
 *   - Returns a typed `CollectionAnalytics` object.
 *   - Provides `isEmpty` flag for empty-state handling.
 *   - Long cache time (5 minutes) since analytics change infrequently.
 *   - Auth gate: short-circuits when unauthenticated.
 *
 * ## SWR key
 *
 *   - `['bookmark-collections', 'detail', collectionId, 'analytics']` — scoped to
 *     the specific collection being viewed.
 *
 * ## Cache Policy
 *
 *   - 5 minute stale time (analytics change infrequently).
 *   - Refreshes on focus (revalidateOnFocus: true) for near-realtime updates.
 */

'use client';

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { getCollectionAnalyticsData } from '@/features/bookmarks/api';
import type { CollectionAnalytics } from '@/features/bookmarks/types';
import { collectionAnalyticsKey } from '@/features/bookmarks/types';

/**
 * Public result type for `useCollectionAnalytics`.
 */
export interface UseCollectionAnalyticsResult {
  /** The analytics data for the collection, or null if not loaded. */
  analytics: CollectionAnalytics | null;
  /** True while fetching. */
  isLoading: boolean;
  /** Any fetch error, or null on success/loading. */
  error: ApiError | null;
  /** True when there is no analytics data (empty collection). */
  isEmpty: boolean;
  /** Trigger a manual refetch. */
  mutate: () => Promise<unknown>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch analytics data for a bookmark collection.
 *
 * @param collectionId - The collection UUID to fetch analytics for.
 *                        Pass null/undefined to skip the fetch.
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, isEmpty } = useCollectionAnalytics(collectionId);
 *
 * if (isEmpty) {
 *   return <EmptyAnalyticsState />;
 * }
 *
 * return (
 *   <div>
 *     <p>Total quizzes: {analytics.totalQuizzes}</p>
 *     <p>Average rating: {analytics.averageQuizRating.toFixed(1)}</p>
 *   </div>
 * );
 * ```
 */
export function useCollectionAnalytics(
  collectionId: string | null | undefined,
): UseCollectionAnalyticsResult {
  const { isAuthenticated } = useAuthState();

  // Build the SWR key.
  const swrKey = collectionId && isAuthenticated
    ? collectionAnalyticsKey(collectionId)
    : null;

  const swr = useSWR(swrKey, () => getCollectionAnalyticsData(collectionId!), {
    // Long stale time since analytics don't change frequently
    revalidateOnFocus: true,
    dedupingInterval: 60000, // 1 minute deduping
  });

  // Extract analytics data
  const analytics: CollectionAnalytics | null = swr.data ?? null;

  // Determine if analytics is empty
  // Analytics is considered empty when totalQuizzes is 0
  const isEmpty = analytics !== null && analytics.totalQuizzes === 0;

  // Normalize error
  const error: ApiError | null = (() => {
    const first = swr.error;
    if (!first) return null;
    if (isApiError(first)) return first;
    if (first && typeof first === 'object' && 'status' in first) {
      return first as unknown as ApiError;
    }
    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  return {
    analytics,
    isLoading: swr.isLoading,
    error,
    isEmpty,
    mutate: swr.mutate,
  };
}
