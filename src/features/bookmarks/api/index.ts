// Bookmarks API layer
// Re-exports from wrappers (wrappers use generated SDK)

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
} from '@/features/bookmarks/wrappers/bookmark.wrapper';

export type {
  ListCollectionsParams,
  ListBookmarksParams,
  BookmarkControllerGetBookmarkStatusResult,
} from '@/features/bookmarks/wrappers/bookmark.wrapper';
