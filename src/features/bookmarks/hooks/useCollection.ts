/**
 * `useCollection` — SWR read of a single bookmark collection by ID.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-B2.
 *
 * ## What this hook owns
 *
 *   - Fetches a single collection by ID.
 *   - Returns the raw BookmarkCollection for the detail page.
 *   - Auth gate: short-circuits when unauthenticated.
 *
 * ## SWR key
 *
 *   - `['bookmark-collections', 'detail', collectionId]` — per-collection
 *     detail key.
 *
 * ## 404 handling
 *
 *   - 404 is returned as `collection: null` rather than thrown,
 *     allowing the component to show a "collection not found" state.
 */

'use client';

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { getCollection } from '@/features/bookmarks/api';
import type { BookmarkCollection, BookmarkCollectionResponseDto } from '@/features/bookmarks/types';
import { toBookmarkCollection } from '@/features/bookmarks/types';

/**
 * SWR key factory for a single collection.
 */
export function bookmarkCollectionKey(collectionId: string) {
  return ['bookmark-collections', 'detail', collectionId] as const;
}

export interface UseCollectionResult {
  /** The collection, or null if not found (404) or not loaded. */
  collection: BookmarkCollection | null;
  /** True while fetching. */
  isLoading: boolean;
  /** Any fetch error, or null on success/loading. */
  error: ApiError | null;
  /** Trigger a manual refetch. */
  mutate: () => Promise<unknown>;
}

/**
 * Fetch a single bookmark collection by ID.
 *
 * @param collectionId - The collection UUID to fetch. Pass null/undefined
 *                       to skip the fetch (returns null collection).
 */
export function useCollection(collectionId: string | null | undefined): UseCollectionResult {
  const { isAuthenticated } = useAuthState();

  // Don't fetch if no ID or not authenticated.
  const swrKey = collectionId && isAuthenticated
    ? bookmarkCollectionKey(collectionId)
    : null;

  const swr = useSWR(swrKey, () => getCollection(collectionId!), {
    revalidateOnFocus: true,
  });

  // Extract the collection from the response.
  const collection: BookmarkCollection | null = (() => {
    if (!swr.data) return null;
    const items = (swr.data as unknown as { data?: { items?: Array<Record<string, unknown>> } })?.data?.items;
    if (!items || items.length === 0) return null;
    const first = items[0];
    return toBookmarkCollection(first as unknown as BookmarkCollectionResponseDto);
  })();

  // Normalize error.
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
    collection,
    isLoading: swr.isLoading,
    error,
    mutate: swr.mutate,
  };
}
