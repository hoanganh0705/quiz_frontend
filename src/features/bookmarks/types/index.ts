// Bookmarks types — aligned with backend DTOs

// Re-export from generated SDK
export type {
  BookmarkCollectionListResponseDto,
  BookmarkListResponseDto,
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
  CreateCollectionDto,
  CreateCollectionResponseDto,
  UpdateCollectionDto,
  UpdateCollectionResponseDto,
  AddBookmarkDto,
  AddBookmarkResponseDto,
  RemoveBookmarkResponseDto,
  DeleteCollectionResponseDto,
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
