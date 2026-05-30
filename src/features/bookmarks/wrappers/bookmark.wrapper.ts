/**
 * Bookmarks wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
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
