'use client';

/**
 * `useDefaultCollectionId` — derive the Phase 3 default bookmark
 * collection identifier from the authenticated user's collection list.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B2.
 *
 * ## Phase 3 default-collection rule (locked at TKT-3.10.A1 §1.3)
 *
 *   1. If the user owns a collection whose `name` equals `Favourites`
 *      case-insensitively, return that collection's `collectionId`.
 *   2. Otherwise, return the collection with the earliest valid
 *      `createdAt` timestamp.
 *   3. If the user owns zero collections, return `null`.
 *
 * ## Why a client heuristic
 *
 * The backend does NOT expose an `isDefault` field on
 * `BookmarkCollectionResponseDto` and does NOT auto-create a default
 * collection (verified at TKT-3.10.A1 §1.3). The server-side default
 * is a deferred backend optimization; until then this client heuristic
 * is the canonical Phase 3 behavior. It is deterministic, total (handles
 * zero / one / many collections), and pure (no mutation, no side
 * effects on the input array).
 *
 * ## Pure selector export
 *
 * `selectDefaultCollectionId(collections)` is the pure function that
 * does the work. The hook wraps it with the loading-state distinction
 * required by `useBookmarkQuiz` (TKT-3.10.C1). Tests target the pure
 * selector directly so the deterministic tie-break and immutability
 * properties are locked without rendering React.
 *
 * ## Immutability
 *
 * The selector never mutates the input array. It computes a sorted
 * copy and discards it; the caller's reference is left untouched
 * (verified by the immutability assertion in B2's test file).
 */

import type { BookmarkCollectionResponseDto } from '@/lib/api/generated/schemas';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';

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
   * `isLoading`. The hook surfaces both fields precisely so the
   * action hook (TKT-3.10.C1) can render the "create a collection"
   * CTA only when hydration is complete AND the list is empty.
   */
  defaultCollectionId: string | null;
  /**
   * `true` while the underlying collections list is hydrating. The
   * consumer MUST NOT show the "create a collection" prompt while
   * `isLoading === true` — only after hydration completes with an
   * empty array.
   */
  isLoading: boolean;
}

/**
 * Pure selector: derive the Phase 3 default collection identifier
 * from a list of owned collections. Exported for direct testing.
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
  collections: ReadonlyArray<BookmarkCollectionResponseDto>,
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
  // untouched (B2 AC #5).
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

export function useDefaultCollectionId(): UseDefaultCollectionIdResult {
  const { collections, isLoading } = useBookmarkCollections();

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