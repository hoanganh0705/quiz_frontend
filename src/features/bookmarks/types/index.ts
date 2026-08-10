// Bookmarks types — aligned with backend DTOs

import type { BookmarkCollectionResponseDto, BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas';

// ─── Bookmark filters (used by BookmarkFilters.tsx) ───────────────────────────────

/** Filter value for the bookmark list. */
export type BookmarkFilter = 'all' | 'recent' | 'easy' | 'medium' | 'hard';

/** Sort option for the bookmark list. */
export type BookmarkSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'difficulty';

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
  BulkRemoveBookmarksResponseDto,
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

// ─── Phase 4.6 — Bookmark Collections CRUD ──────────────────────────────────

/**
 * Preset color palette for bookmark collections.
 * Used by CollectionColorPicker and as fallback when no color is set.
 */
export const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];

/**
 * Extended collection type for Phase 4.6 CRUD operations.
 * Adds `color` field (optional) for custom collection colors.
 *
 * The `id` field is an alias for `collectionId` required by the
 * cursor pagination primitive (`useCursorPaginated`).
 * The `color` field falls back to a deterministic color derived
 * from the `collectionId` when not set.
 */
export interface BookmarkCollection {
  /** Unique identifier — also aliased as `id` for cursor pagination. */
  collectionId: string;
  /** Alias for `collectionId` — required by `useCursorPaginated` constraint `{ id: string }`. */
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  /** Optional color. Falls back to deterministic color from collectionId. */
  color?: string | null;
  quizCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maps a BookmarkCollectionResponseDto to BookmarkCollection.
 * Adds color field (may be undefined if backend doesn't support it yet).
 * Also adds `id` alias for cursor pagination.
 */
export function toBookmarkCollection(
  dto: BookmarkCollectionResponseDto,
): BookmarkCollection {
  return {
    collectionId: dto.collectionId,
    id: dto.collectionId, // Alias for cursor pagination.
    userId: dto.userId,
    name: dto.name,
    description: dto.description,
    color: (dto as unknown as { color?: string | null }).color ?? null,
    quizCount: dto.quizCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Generate a deterministic color from a string (e.g., collectionId).
 * Uses a simple hash to pick from PRESET_COLORS.
 */
function hashStringToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % PRESET_COLORS.length;
}

/**
 * Get the display color for a collection.
 * Returns the collection's color if set, otherwise a deterministic fallback.
 */
export function getCollectionColor(collection: BookmarkCollection): string {
  if (collection.color && typeof collection.color === 'string' && collection.color.length > 0) {
    return collection.color;
  }
  return PRESET_COLORS[hashStringToIndex(collection.collectionId)];
}

/**
 * SWR key for the collections lookup Map.
 * Used by useCollectionsLookup() for fast O(1) access by collectionId.
 */
export const BOOKMARK_COLLECTIONS_LOOKUP_KEY = ['bookmark-collections-lookup'] as const;

// ─── Phase 4.7 — Collection Detail Types ─────────────────────────────────────

export type {
  CollectionQuiz,
  BulkOperationResult,
  BulkAddResult,
  BulkRemoveResult,
  CollectionAnalytics,
  BulkAddQuizzesPayload,
  BulkRemoveQuizzesPayload,
} from './collection-detail.types';
export {
  toCollectionQuiz,
  toCollectionAnalytics,
  collectionQuizzesKey,
  collectionAnalyticsKey,
  BULK_OPERATION_MAX_ITEMS,
  BULK_OPERATION_MIN_ITEMS,
} from './collection-detail.types';

// Alias for BookmarkedQuizResponseDto — used by BookmarkedQuizCard.
export type BookmarkedQuiz = BookmarkedQuizResponseDto;
