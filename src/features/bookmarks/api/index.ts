// Bookmarks API layer
// Re-exports from the new service module (TKT-4.1.G2).

export {
  listCollections,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addBookmark,
  removeBookmark,
  listBookmarksInCollection,
  getBookmarkStatus,
  addBookmarksBulk,
  removeBookmarksBulk,
  getCollectionAnalytics,
} from '@/features/bookmarks/services/bookmarks.service';

export {
  listCollectionQuizzesPaginated,
  addQuizzesToCollectionBulk,
  removeQuizzesFromCollectionBulk,
  getCollectionAnalyticsData,
  BulkOperationValidationError,
} from '@/features/bookmarks/services/collection-detail.service';

export type {
  ListCollectionQuizzesResponse,
} from '@/features/bookmarks/services/collection-detail.service';

export type {
  ListCollectionsParams,
  ListBookmarksParams,
  BookmarkControllerGetBookmarkStatusResult,
} from '@/features/bookmarks/services/bookmarks.service';