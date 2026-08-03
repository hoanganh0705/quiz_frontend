/**
 * `useCollections` — cursor-paginated SWR read of the authenticated user's
 * bookmark collections.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-B1.
 *
 * ## What this hook owns
 *
 *   - Fetches collections with cursor pagination via `useCursorPaginated`.
 *   - Returns a `Map<string, BookmarkCollection>` for fast O(1) lookup.
 *   - Provides both the items array and the Map for different use cases.
 *   - Auth gate: short-circuits when unauthenticated.
 *
 * ## SWR key
 *
 *   - `['bookmark-collections', 'list']` — used by mutation hooks to
 *     invalidate the cache on create/update/delete.
 *
 * ## Pagination
 *
 *   - Uses `useCursorPaginated` from Phase 3.
 *   - Supports `limit` param (default 20).
 *   - Returns `loadMore` for triggering next page.
 *
 * @see useCollectionsLookup — the Map-based store for cross-feature access.
 */

'use client';

import { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError, useCursorPaginated } from '@/lib/api';
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { listCollections } from '@/features/bookmarks/api';
import type { BookmarkCollection, BookmarkCollectionResponseDto } from '@/features/bookmarks/types';
import {
  BOOKMARK_COLLECTIONS_LOOKUP_KEY,
  toBookmarkCollection,
} from '@/features/bookmarks/types';

/**
 * SWR key for the collections list.
 * Exported so mutation hooks can invalidate the cache.
 */
export const BOOKMARK_COLLECTIONS_KEY = ['bookmark-collections', 'list'] as const;

/**
 * Wire response shape from the SDK.
 */
type ListCollectionsResponse = {
  data?: { items: Array<Record<string, unknown>> };
  meta?: {
    pagination?: {
      kind: 'cursor';
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

/**
 * Public result type for `useCollections`.
 */
export interface UseCollectionsResult extends UseCursorPaginatedResult<BookmarkCollection> {
  /** Map of collectionId → BookmarkCollection for O(1) lookup. */
  collectionsMap: Map<string, BookmarkCollection>;
  /** Invalidate and refetch the collections list. */
  refresh: () => Promise<void>;
}

/**
 * Cursor-paginated list of the authenticated user's bookmark collections.
 *
 * @param params - Optional params including `limit` for page size.
 */
export function useCollections(params?: {
  limit?: number;
}): UseCollectionsResult {
  const { isAuthenticated } = useAuthState();

  // Build the fetcher that wraps the SDK call.
  const fetcher = useMemo(
    (): (args: CursorFetcherArgs<{ limit?: number }>) => Promise<CursorPage<BookmarkCollection>> =>
      async ({ cursor, params: fetcherParams, signal }) => {
        const result = (await listCollections()) as unknown as ListCollectionsResponse;

        const items = (result.data?.items ?? []) as Array<Record<string, unknown>>;
        const mapped: BookmarkCollection[] = items.map((item) =>
          toBookmarkCollection(item as unknown as BookmarkCollectionResponseDto),
        );

        // Assign `id` alias so cursor pagination deduplication works.
        const itemsWithId: BookmarkCollection[] = mapped.map((item) =>
          Object.assign({}, item, { id: item.collectionId }),
        );

        const pagination = result.meta?.pagination;
        return {
          items: itemsWithId,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pagination?.limit ?? itemsWithId.length,
        };
      },
    [],
  );

  // Cursor pagination with the base key.
  const cursorResult = useCursorPaginated<BookmarkCollection, { limit?: number }>({
    key: BOOKMARK_COLLECTIONS_KEY,
    fetcher,
    params: { limit: params?.limit ?? 20 },
    paginationKind: 'cursor',
    revalidateOnFocus: true,
  });

  // Build the Map from items.
  const collectionsMap = useMemo<Map<string, BookmarkCollection>>(() => {
    const map = new Map<string, BookmarkCollection>();
    for (const item of cursorResult.items) {
      map.set(item.collectionId, item);
    }
    return map;
  }, [cursorResult.items]);

  // Refresh that triggers a full revalidation.
  const refresh = useCallback(async (): Promise<void> => {
    await cursorResult.refresh();
  }, [cursorResult.refresh]);

  return {
    ...cursorResult,
    collectionsMap,
    refresh,
  };
}

/**
 * Invalidate the collections cache.
 * Call this after create/update/delete mutations.
 */
export async function invalidateCollections(): Promise<void> {
  await globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
}
