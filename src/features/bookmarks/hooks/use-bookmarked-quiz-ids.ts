'use client';

/**
 * `useBookmarkedQuizIds` — SWR-backed deduplicated `Set<string>` of
 * every quiz ID the authenticated user has bookmarked.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B3.
 *
 * ## What this hook owns
 *
 *   - The single source-of-truth membership read consumed by:
 *       - `useIsBookmarked(quizId)` (TKT-3.10.B4) — boolean selector
 *         over `quizIds.has(quizId)`.
 *       - `<BookmarkButton>` (TKT-3.10.D2) — reads `quizIds` to render
 *         the active / inactive state.
 *       - The cross-tab invalidator (TKT-3.10.F3) — re-renders all
 *         subscribers when a sibling tab mutates the membership.
 *
 *   - The hydration chain: `useBookmarkCollections` →
 *     `useSWR` keyed by `['bookmarked-quiz-ids']` → one fan-out fetch
 *     per collection via `listBookmarksInCollection(collectionId)` →
 *     a single deduplicated `Set<string>` built by union.
 *
 *   - A stable SWR key (`bookmarkedQuizIdsKey()`) that the mutation
 *     hooks (TKT-3.10.C1 / C2) and the cross-tab broadcast (F3) can
 *     invalidate via the global `mutate(key)` form.
 *
 * ## Why a fan-out (strategy (a))
 *
 * The membership is derived from the union of all collection members.
 * There is no server endpoint that returns the membership as a flat
 * list (verified at TKT-3.10.A1 §6 item 2). The fan-out is a Phase 3
 * acceptable trade-off: typical users have < 5 collections; power
 * users have < 50; each fan-out is a single-page GET. The fetcher
 * awaits `Promise.all` so the SWR resolve time is the longest single
 * fetch, not the sum.
 *
 * ## Set replacement (AC #6)
 *
 * The `Set<string>` returned to consumers is REPLACED on every SWR
 * update — never mutated. This protects React consumers from the
 * "same reference, different content" mutation trap, and is the
 * same discipline `useFollowedLookup` (TKT-3.9.B3) follows.
 *
 * ## Auth gate + zero-collection shortcut (AC #1, #2)
 *
 * When `isAuthenticated === false`, the membership SWR key resolves
 * to `null` so SWR skips the fetch entirely. When the user owns
 * zero collections, the hook returns an empty Set without firing any
 * `listBookmarksInCollection` call — the membership SWR key still
 * hydrates (so `isLoading: false`), but the fetcher is the identity
 * `() => Promise.resolve(new Set<string>())`.
 *
 * ## Partial failure (AC #5)
 *
 * A failure in any single `listBookmarksInCollection` call rejects
 * the entire fan-out. The hook surfaces the error to the consumer
 * and leaves the membership `Set` empty for that render so a
 * partial-failure snapshot cannot leak as authoritative state.
 *
 * @see useBookmarkCollections (B1)
 * @see useIsBookmarked (B4)
 * @see useBookmarkQuiz / useUnbookmarkQuiz (C1 / C2)
 * @see cross-tab broadcast (F3)
 */

import { useMemo } from 'react';
import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import type { BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { listBookmarksInCollection } from '@/features/bookmarks/api';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';

/**
 * SWR key for the membership set. Stable across renders; the
 * auth gate captures the auth state into the resolved-vs-null key.
 *
 * Exported so the per-feature action hooks (C1, C2) and the
 * cross-tab invalidator (F3) can invalidate the membership set
 * after a successful mutation.
 */
export const bookmarkedQuizIdsKey = () => ['bookmarked-quiz-ids'] as const;

export interface UseBookmarkedQuizIdsResult {
  /**
   * The deduplicated set of quiz IDs the authenticated user has
   * bookmarked across every owned collection. Replaced (not
   * mutated) on every SWR update.
   */
  quizIds: ReadonlySet<string>;
  /**
   * `true` while the collections list or the fan-out membership
   * fetches are in-flight. The auth gate holds the loading state
   * `false` because no fetch is fired when unauthenticated.
   */
  isLoading: boolean;
  /**
   * The first error from any fan-out fetch, surfaced for the
   * page-level banner. `null` while loading or on success.
   */
  error: ApiError | null;
  /**
   * Re-fetch the membership set. Called by the per-feature
   * action hooks (C1 / C2) on success to refresh the membership
   * snapshot.
   */
  mutate: () => Promise<unknown>;
}

/**
 * Build the deduplicated membership `Set<string>` from the union of
 * every collection's bookmarked-quiz list.
 *
 * Pure function — extracted for direct testing of the
 * deduplication and replacement discipline (AC #3, #4, #6).
 */
export function buildBookmarkedQuizIdSet(
  memberLists: ReadonlyArray<ReadonlyArray<BookmarkedQuizResponseDto>>,
): ReadonlySet<string> {
  // REPLACE the Set on every call; never mutate (AC #6).
  const union = new Set<string>();
  for (const list of memberLists) {
    for (const bookmark of list) {
      if (typeof bookmark.quizId === 'string' && bookmark.quizId.length > 0) {
        union.add(bookmark.quizId);
      }
    }
  }
  return union;
}

/**
 * Identity fetcher used when the user owns zero collections.
 * Resolves to an empty array so the SWR cache hydrates and the
 * consumer sees `isLoading: false`, `error: null`,
 * `quizIds: new Set()`.
 */
const EMPTY_FETCHER = async (): Promise<ReadonlyArray<never>> => [];

export function useBookmarkedQuizIds(): UseBookmarkedQuizIdsResult {
  const { isAuthenticated } = useAuthState();
  const { collections, isLoading: collectionsLoading } = useBookmarkCollections();

  // Build a stable key that includes the collections list so a
  // change in the owned collections triggers a refetch. The
  // collections list is an array — using `collections.map(c =>
  // c.collectionId).join('|')` is a stable, equality-cheap key
  // that captures "which collections exist" without serializing
  // the whole DTO.
  const collectionIdsKey = useMemo(
    () => collections.map((c) => c.collectionId).sort().join('|'),
    [collections],
  );

  // The membership SWR key resolves to `null` (skip fetch) when:
  //   - the user is unauthenticated,
  //   - the collections list is still hydrating (we cannot fan-out
  //     until we know which collections to query).
  // The key resolves to a tuple of `['bookmarked-quiz-ids', idsKey]`
  // otherwise. The empty-collection case resolves to the same key
  // but with an empty `idsKey`; SWR dedupes these so the empty-set
  // result is cached.
  const swrKey = isAuthenticated && !collectionsLoading
    ? (['bookmarked-quiz-ids', collectionIdsKey] as const)
    : null;

  // When the user owns zero collections we short-circuit to the
  // identity fetcher. SWR's `key` is the deduplication token; the
  // `null` branch covers unauthenticated + hydrating, and the
  // empty-ids branch covers "authenticated, zero collections".
  const fetcher = swrKey
    ? async (): Promise<ReadonlyArray<BookmarkedQuizResponseDto>> => {
        if (collections.length === 0) {
          return EMPTY_FETCHER();
        }
        const perCollection = await Promise.all(
          collections.map((c) =>
            listBookmarksInCollection(c.collectionId).then(
              (page) => page?.data?.items ?? [],
            ),
          ),
        );
        // Flatten to a single array for the SWR cache; the Set is
        // built on read by `buildBookmarkedQuizIdSet`.
        return perCollection.flat();
      }
    : null;

  const swr = useSWR(swrKey, fetcher, {
    // Phase 3 membership is read-mostly and updates on mutation
    // (C1 / C2 invalidates this key). The global config's
    // `revalidateOnFocus: false` is correct here — the cross-tab
    // broadcast (F3) handles sibling-tab updates.
    revalidateOnFocus: false,
  });

  // Derive the deduplicated Set on every render. SWR guarantees
  // `data` is replaced (not mutated) on each update, so the
  // `useMemo` can drop the dependency on `swr.data` reference and
  // recompute whenever the underlying data changes. We pass the
  // single flattened array as the sole input so the pure function
  // is straightforward to test.
  const quizIds = useMemo<ReadonlySet<string>>(
    () => buildBookmarkedQuizIdSet([swr.data ?? []]),
    [swr.data],
  );

  // Loading state:
  //   - unauthenticated → `false` (no fetch is fired);
  //   - collections still hydrating → `true`;
  //   - membership SWR fetch still in-flight → `true`.
  const isLoading = !isAuthenticated
    ? false
    : collectionsLoading || (swr.isLoading && Boolean(swrKey));

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
    quizIds,
    isLoading,
    error,
    mutate: swr.mutate,
  };
}