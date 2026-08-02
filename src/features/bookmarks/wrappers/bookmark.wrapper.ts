/**
 * Bookmarks wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * Source epics:
 *   - Epic 3.10 — Story 3.10 (Bookmarks add / remove + membership lookup).
 *     Tickets: TKT-3.10.A2 (this file extension), TKT-3.10.B1/B2/B3 (hooks
 *     that consume the wrapper), and TKT-3.10.C1/C2 (mutation hooks
 *     that consume `addBookmark` / `removeBookmark`).
 *
 * The wrapper is the ONLY place the bookmarks SDK is imported. Hooks
 * and components in `src/features/bookmarks/**` import from
 * `@/features/bookmarks/wrappers/bookmark.wrapper` (this file); they
 * MUST NOT import from `@/lib/api/generated/bookmarks/bookmarks`
 * directly. This is the cross-story contract rule (mirrors what
 * Story 3.9 does for `category.wrapper.ts` and `tag.wrapper.ts`).
 *
 * ## Drift notes (TKT-3.10.A1)
 *
 * The planning doc (Story 3.10 lines 1061-1064) listed the SDK
 * operations by their planning-intent names (`bookmarksController*`,
 * plural prefix). The regenerated SDK uses singular
 * `bookmarkController*`. The wrapper preserves the planning-intent
 * camelCase verbs (`getBookmarkStatus`, `addBookmark`, `removeBookmark`,
 * `listCollections`, `listBookmarksInCollection`) so the drift is
 * invisible to feature hooks.
 *
 * The semantics of `bookmarkControllerListBookmarksInCollection(id)`:
 * the GET `/bookmarks/collections/:collectionId` endpoint returns the
 * **bookmarked quizzes** in that collection (not the collection
 * record itself). The wrapper exposes it as `listBookmarksInCollection`
 * for clarity.
 *
 * The collection list endpoint `bookmarkControllerListCollections()`
 * takes no parameters on the wire (the planning-intent
 * `bookmarksControllerGetCollections(params)` was parameter-shaped but
 * the regenerated SDK dropped the params).
 */

import { getBookmarks } from '@/lib/api/generated/bookmarks/bookmarks';
import type {
  CreateCollectionDto,
  UpdateCollectionDto,
  AddBookmarkDto,
} from '@/lib/api/generated/schemas';

export type {
  BookmarkControllerListCollectionsResult,
  BookmarkControllerCreateCollectionResult,
  BookmarkControllerListBookmarksInCollectionResult,
  BookmarkControllerUpdateCollectionResult,
  BookmarkControllerDeleteCollectionResult,
  BookmarkControllerAddBookmarkResult,
  BookmarkControllerRemoveBookmarkResult,
  BookmarkControllerGetBookmarkStatusResult,
} from '@/lib/api/generated/bookmarks/bookmarks';

export interface ListCollectionsParams {
  cursor?: string
  limit?: number
}

export interface ListBookmarksParams {
  cursor?: string
  limit?: number
}

// ─── Collection Endpoints ───────────────────────────────────────────────────────

export async function listCollections(params?: ListCollectionsParams) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListCollections(params);
}

export async function createCollection(params: CreateCollectionDto) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerCreateCollection(params);
}

export async function getCollection(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListBookmarksInCollection(collectionId);
}

export async function updateCollection(
  collectionId: string,
  params: UpdateCollectionDto
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerUpdateCollection(collectionId, params);
}

export async function deleteCollection(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerDeleteCollection(collectionId);
}

// ─── Bookmark Endpoints ────────────────────────────────────────────────────────

export async function addBookmark(
  collectionId: string,
  params: AddBookmarkDto
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerAddBookmark(collectionId, params);
}

export async function removeBookmark(
  collectionId: string,
  quizId: string
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerRemoveBookmark(collectionId, quizId);
}

export async function listBookmarksInCollection(
  collectionId: string,
  params?: ListBookmarksParams
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListBookmarksInCollection(collectionId, params);
}

/**
 * Per-quiz bookmark status. GET `/api/v1/bookmarks/quizzes/:quizId/status`.
 *
 * Wraps `getBookmarks().bookmarkControllerGetBookmarkStatus(quizId)`.
 * Returns the inner `WrappedDto & { data?: BookmarkStatusResponseDto }`
 * shape, where `BookmarkStatusResponseDto = { bookmarked, collections }`
 * (`BookmarkStatusCollectionDto[]`).
 *
 * This endpoint **never returns 404** — the controller responds 200
 * with `{ bookmarked: false, collections: [] }` for both "user has not
 * bookmarked" and "quiz does not exist" cases (Phase 7 H7 of the
 * bookmark API contract audit). The hook layer therefore never has to
 * handle 404 on this path.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.A2.
 *
 * Thin pass-through — no business logic, no error wrapping, no SWR
 * cache invalidation (the membership hooks in Batch B own cache
 * invalidation through SWR's `mutate(...)`).
 */
export async function getBookmarkStatus(quizId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerGetBookmarkStatus(quizId);
}
