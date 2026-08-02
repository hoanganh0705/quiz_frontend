'use client';

/**
 * `useBookmarkCollections` — auth-gated SWR read of the current user's
 * bookmark collection summaries.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B1.
 *
 * ## What this hook owns
 *
 *   - The single source-of-truth read of the authenticated user's
 *     collection summaries, consumed by:
 *       - `useDefaultCollectionId` (TKT-3.10.B2) — derives the Phase 3
 *         default collection.
 *       - `useBookmarkedQuizIds` (TKT-3.10.B3) — fans out the membership
 *         cache.
 *       - `useBookmarkQuiz` / `useUnbookmarkQuiz` (TKT-3.10.C1 / C2) —
 *         refresh the collections summary after a successful mutation.
 *
 *   - The auth gate. When `useAuthState().isAuthenticated === false`,
 *     the hook short-circuits to an empty array without firing any
 *     fetch — the SWR key resolves to `null` so SWR skips the fetch
 *     and `data` stays undefined.
 *
 *   - A stable SWR key that the action hooks (C1 / C2) and the
 *     cross-tab broadcast (F1 / F3) can invalidate via the global
 *     `mutate(key)` form.
 *
 * ## Why no collection CRUD
 *
 * Story 3.10 is read + mutate-only. Collection create / rename /
 * delete is deferred to Phase 5. The legacy local-storage hook in
 * `features/bookmarks/hooks/use-bookmarks.ts` covers the protected
 * `/bookmarks` page route in the meantime; this hook is the
 * SWR-backed source of truth for the public surfaces (quiz cards,
 * quiz detail CTA).
 *
 * @see useDefaultCollectionId (B2)
 * @see useBookmarkedQuizIds (B3)
 * @see useBookmarkQuiz / useUnbookmarkQuiz (C1 / C2)
 */

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import type { BookmarkCollectionResponseDto } from '@/lib/api/generated/schemas';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { listCollections } from '@/features/bookmarks/api';

/**
 * SWR key for the collections list. Stable across renders; the
 * auth gate captures the auth state into the resolved-vs-null key.
 *
 * Exported so the per-feature action hooks (C1, C2) and the
 * cross-tab invalidator (F3) can invalidate the collections
 * summary after a successful bookmark / unbookmark mutation.
 */
export const bookmarkCollectionsKey = () =>
  ['bookmark-collections'] as const;

export interface UseBookmarkCollectionsResult {
  /**
   * The array of collections owned by the authenticated user.
   * Empty until the lookup hydrates, or until the auth gate
   * permits a fetch.
   */
  collections: ReadonlyArray<BookmarkCollectionResponseDto>;
  /**
   * `true` while the fetch is in-flight. The auth gate holds
   * the loading state `false` because no fetch is fired when
   * unauthenticated.
   */
  isLoading: boolean;
  /**
   * The first error from the fetch, surfaced for the page-level
   * banner / debug surface. `null` while loading or on success.
   */
  error: ApiError | null;
  /**
   * Re-fetch the collections list. Called by the per-feature
   * action hooks (C1 / C2) on success to refresh the membership
   * snapshot.
   */
  mutate: () => Promise<unknown>;
}

function extractCollections(
  page: Awaited<ReturnType<typeof listCollections>> | undefined,
): ReadonlyArray<BookmarkCollectionResponseDto> {
  return page?.data?.items ?? [];
}

export function useBookmarkCollections(): UseBookmarkCollectionsResult {
  const { isAuthenticated } = useAuthState();

  // The SWR keys include the auth state. When unauthenticated, the
  // key resolves to `null`, which SWR treats as "disable the fetch".
  // The result is the documented empty-array default — same
  // discipline as `useFollowedLookup` (TKT-3.9.B3).
  const swrKey = isAuthenticated ? bookmarkCollectionsKey() : null;

  const swr = useSWR(swrKey, () => listCollections(), {
    // Story 3.10 mirrors Story 3.9 line 1002 — Phase 3 lists
    // refresh on route entry (the global config) and on focus
    // (this hook overrides), so a returning user sees fresh
    // state. Other SWR defaults are inherited from SwrProvider
    // (`dedupingInterval: 2_000`, `errorRetryCount: 3`,
    // `shouldRetryOnError: 429 || 5xx`).
    revalidateOnFocus: true,
  });

  const collections = extractCollections(swr.data);

  const error: ApiError | null = (() => {
    const first = swr.error;
    if (!first) return null;
    if (isApiError(first)) return first;
    // Defensive fallback: SWR may surface a plain Error from a test
    // mock or a transport failure. The consumer's `error !== null`
    // check works regardless.
    if (first && typeof first === 'object' && 'status' in first) {
      return first as unknown as ApiError;
    }
    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  return {
    collections,
    isLoading: swr.isLoading,
    error,
    mutate: swr.mutate,
  };
}