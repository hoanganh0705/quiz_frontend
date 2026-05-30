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
} from '@/features/bookmarks/wrappers/bookmark.wrapper';

export type {
  ListCollectionsParams,
  ListBookmarksParams,
} from '@/features/bookmarks/wrappers/bookmark.wrapper';
