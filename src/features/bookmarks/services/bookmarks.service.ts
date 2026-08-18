

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