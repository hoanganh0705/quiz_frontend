'use client';

/**
 * `useDefaultCollectionId` — derive the Phase 3 default bookmark
 * collection identifier from the authenticated user's collection list.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD.
 * Source ticket: T-4.6-E3.
 *
 * ## Phase 3 default-collection rule (locked at TKT-3.10.A1 §1.3)
 *
 *   1. If the user owns a collection whose `name` equals `Favourites`
 *      case-insensitively, return that collection's `collectionId`.
 *   2. Otherwise, return the collection with the earliest valid
 *      `createdAt` timestamp.
 *   3. If the user owns zero collections, return `null`.
 *
 * ## Updated for Epic 4.6
 *
 * This hook now uses `useCollections` (T-4.6-B1) which returns
 * `BookmarkCollection` objects instead of the raw DTO.
 */

import type { BookmarkCollection } from '@/features/bookmarks/types';
import { useCollections } from '@/features/bookmarks/hooks';

/** The canonical Phase 3 default-collection name (case-insensitive). */
export const DEFAULT_COLLECTION_NAME = 'Favourites';

export interface UseDefaultCollectionIdResult {
  /**
   * The default collection's UUID, or `null` when:
   *   - the user is unauthenticated,
   *   - the collections list is still hydrating (loading state),
   *   - the user owns zero collections.
   *
   * Consumers MUST distinguish `defaultCollectionId === null` from
   * `isLoading`. The hook surfaces both fields precisely so callers
   * can render the "create a collection" CTA only when hydration
   * is complete AND the list is empty.
   */
  defaultCollectionId: string | null;
  /**
   * `true` while the underlying collections list is hydrating.
   */
  isLoading: boolean;
}

/**
 * Pure selector: derive the Phase 3 default collection identifier
 * from a list of collections. Exported for direct testing.
 *
 * - Returns the case-insensitive `Favourites` match when present.
 * - Otherwise returns the collection with the earliest valid
 *   `createdAt` timestamp.
 * - Returns `null` for an empty input array.
 * - Does NOT mutate the input array.
 *
 * Ties on `createdAt` (two collections with the same ISO 8601
 * timestamp) break by `collectionId` ascending — a stable, deterministic
 * order that does not depend on the backend's array order.
 */
export function selectDefaultCollectionId(
  collections: ReadonlyArray<BookmarkCollection>,
): string | null {
  if (collections.length === 0) {
    return null;
  }

  // Step 1 — case-insensitive Favourites match.
  for (const collection of collections) {
    if (
      typeof collection.name === 'string' &&
      collection.name.trim().toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()
    ) {
      return collection.collectionId;
    }
  }

  // Step 2 — earliest createdAt, tie-broken by collectionId ascending.
  // We copy the array before sorting so the caller's reference is
  // untouched.
  const sorted = [...collections].sort((a, b) => {
    const aCreated = Date.parse(a.createdAt);
    const bCreated = Date.parse(b.createdAt);
    // `Number.isNaN` on `Date.parse` returns `NaN` for invalid input;
    // we treat invalid timestamps as the highest value so a malformed
    // entry cannot leapfrog a valid earlier entry. Sort is stable in
    // V8 (es2019+) so equal `createdAt` values retain their input order,
    // and we add a deterministic `collectionId` tiebreak on top of
    // that stability.
    if (Number.isNaN(aCreated) && Number.isNaN(bCreated)) {
      return a.collectionId.localeCompare(b.collectionId);
    }
    if (Number.isNaN(aCreated)) return 1;
    if (Number.isNaN(bCreated)) return -1;
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }
    return a.collectionId.localeCompare(b.collectionId);
  });

  return sorted[0]?.collectionId ?? null;
}

/**
 * Hook that derives the default collection ID from the collections list.
 */
export function useDefaultCollectionId(): UseDefaultCollectionIdResult {
  const { items: collections, isLoading } = useCollections();

  // The default selector is deterministic and pure; we compute it
  // every render. The cost is `O(n log n)` on the collection list
  // (which is bounded by the backend's collection count — typical
  // users have < 50 collections; power users have < 500). At those
  // sizes the memoization overhead would dominate the sort cost.
  const defaultCollectionId = selectDefaultCollectionId(collections);

  return {
    defaultCollectionId,
    isLoading,
  };
}
