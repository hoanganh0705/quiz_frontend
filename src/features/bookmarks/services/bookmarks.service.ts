/**
 * `bookmarks.service.ts` — Phase 4 bookmark write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F2.
 *
 * The single import surface for every Phase 4 bookmark mutation:
 *
 *   - Collection CRUD: create / list / get / update / delete / analytics
 *   - Bulk operations: addQuizzesBulk / removeQuizzesBulk
 *
 * Re-exporting the per-feature DTOs and `Result` types keeps callers
 * (the per-feature mutation hooks of stories 4.6 / 4.7 — Bookmark
 * Collection Editor, Bulk Remove Sheet) from reaching into the SDK
 * barrel directly.
 *
 * ## Pattern: thin pass-through (matches `bookmark.wrapper.ts`)
 *
 * See `quizzes.service.ts` for the rationale — this service is a
 * typed pass-through to the generated SDK. Cross-cutting concerns
 * (cache invalidation, telemetry, mutation hooks) are owned by the
 * per-feature hooks. `useOptimisticMutation` (TKT-4.1.E1) is the
 * consumer-facing primitive.
 *
 * ## Error surfacing
 *
 * The SDK's `orvalCustomInstance` translates every non-2xx into a
 * typed `ApiError` whose `.code` is one of the 132 members of
 * `ErrorCode`. Service functions do NOT swallow errors; they propagate
 * the original `ApiError` so callers can read `apiError.code` per the
 * cross-story contract rule.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { getBookmarks } from '@/lib/api';

import type {
  CreateCollectionDto,
  UpdateCollectionDto,
  AddBookmarkDto,
  BulkAddBookmarksDto,
  BulkRemoveBookmarksDto,
} from '@/lib/api/generated/schemas';

export type {
  BookmarkControllerCreateCollectionResult,
  BookmarkControllerListCollectionsResult,
  BookmarkControllerListBookmarksInCollectionResult,
  BookmarkControllerUpdateCollectionResult,
  BookmarkControllerDeleteCollectionResult,
  BookmarkControllerAddBookmarkResult,
  BookmarkControllerAddBookmarksBulkResult,
  BookmarkControllerRemoveBookmarksBulkResult,
  BookmarkControllerGetCollectionAnalyticsResult,
  BookmarkControllerGetBookmarkStatusResult,
  BookmarkControllerRemoveBookmarkResult,
} from '@/lib/api/generated/bookmarks/bookmarks';

export interface ListBookmarksParams {
  cursor?: string;
  limit?: number;
}

export interface ListCollectionsParams {
  cursor?: string;
  limit?: number;
}

// ─── Collection CRUD ────────────────────────────────────────────────────

export async function createCollection(payload: CreateCollectionDto) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerCreateCollection(payload);
}

export async function listCollections() {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListCollections();
}

export async function getCollection(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListBookmarksInCollection(collectionId);
}

export async function updateCollection(
  collectionId: string,
  payload: UpdateCollectionDto,
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerUpdateCollection(collectionId, payload);
}

export async function deleteCollection(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerDeleteCollection(collectionId);
}

export async function getCollectionAnalytics(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerGetCollectionAnalytics(collectionId);
}

// ─── Bookmark Membership ────────────────────────────────────────────────

export async function addBookmark(
  collectionId: string,
  payload: AddBookmarkDto,
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerAddBookmark(collectionId, payload);
}

export async function addBookmarksBulk(
  collectionId: string,
  payload: BulkAddBookmarksDto,
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerAddBookmarksBulk(collectionId, payload);
}

export async function removeBookmarksBulk(
  collectionId: string,
  payload: BulkRemoveBookmarksDto,
) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerRemoveBookmarksBulk(collectionId, payload);
}

export async function removeBookmark(collectionId: string, quizId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerRemoveBookmark(collectionId, quizId);
}

export async function getBookmarkStatus(quizId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerGetBookmarkStatus(quizId);
}

export async function listBookmarksInCollection(collectionId: string) {
  const sdk = getBookmarks();
  return sdk.bookmarkControllerListBookmarksInCollection(collectionId);
}