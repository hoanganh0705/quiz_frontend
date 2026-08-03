/**
 * `collection-detail.types.ts` — TypeScript types for Epic 4.7 Collection Detail.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B1-1.
 *
 * ## Types in this file
 *
 *   - `CollectionQuiz` — enriched bookmarked quiz with `id` alias for cursor pagination.
 *   - `BulkOperationResult` — per-item result from bulk operations (add/remove).
 *   - `BulkAddQuizzesPayload` — validated payload for bulk add (1-100 quiz IDs).
 *   - `BulkRemoveQuizzesPayload` — validated payload for bulk remove (1-100 quiz IDs).
 *   - `CollectionAnalytics` — analytics data shape for the analytics panel.
 *
 * ## Re-exports from generated schemas
 *
 * We re-export from the generated SDK types where possible to maintain
 * compatibility with the OpenAPI-generated types.
 */

import type {
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
  BulkAddBookmarksDto,
  BulkRemoveBookmarksDto,
  BookmarkCollectionAnalyticsResponseDto,
  BookmarkCollectionAnalyticsSummaryDto,
} from '@/lib/api/generated/schemas';

// ─── Re-exports ────────────────────────────────────────────────────────────────

export type {
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
  BulkAddBookmarksDto,
  BulkRemoveBookmarksDto,
  BookmarkCollectionAnalyticsResponseDto,
  BookmarkCollectionAnalyticsSummaryDto,
} from '@/lib/api/generated/schemas';

// ─── Bookmarked Quiz ───────────────────────────────────────────────────────────

/**
 * Enriched bookmarked quiz for the collection detail page.
 * Adds `id` alias (required by `useCursorPaginated`) and maps
 * `bookmarkedAt` → `addedAt` for clearer semantics.
 */
export interface CollectionQuiz {
  /** Bookmark record identifier. */
  bookmarkId: string;
  /** Alias for `bookmarkId` — required by `useCursorPaginated`. */
  id: string;
  /** Quiz identifier. */
  quizId: string;
  /** Quiz title. */
  quizTitle: string;
  /** Quiz slug. */
  quizSlug: string;
  /** Quiz cover image URL. */
  quizImageUrl: string | null;
  /** Whether the quiz is featured. */
  quizIsFeatured: boolean;
  /** Personal notes. */
  notes: string | null;
  /** When the quiz was bookmarked. */
  addedAt: string;
  /** When the quiz was bookmarked (raw field from API). */
  bookmarkedAt: string;
}

/**
 * Maps a `BookmarkedQuizResponseDto` to `CollectionQuiz`.
 */
export function toCollectionQuiz(dto: BookmarkedQuizResponseDto): CollectionQuiz {
  return {
    bookmarkId: dto.bookmarkId,
    id: dto.bookmarkId,
    quizId: dto.quizId,
    quizTitle: dto.quizTitle,
    quizSlug: dto.quizSlug,
    quizImageUrl: dto.quizImageUrl ?? null,
    quizIsFeatured: dto.quizIsFeatured,
    notes: dto.notes ?? null,
    addedAt: dto.bookmarkedAt,
    bookmarkedAt: dto.bookmarkedAt,
  };
}

// ─── Bulk Operation Result ─────────────────────────────────────────────────────

/**
 * Status of a single item in a bulk operation.
 */
export type BulkOperationStatus = 'success' | 'error';

/**
 * Per-item result from bulk add or bulk remove operations.
 * Used to surface partial failures in the BulkResultList component.
 */
export interface BulkOperationResult {
  /** Zero-based index of this item in the request array. */
  index: number;
  /** The quiz ID that was processed. */
  quizId: string;
  /** Whether this item succeeded or failed. */
  status: BulkOperationStatus;
  /** HTTP status code (2xx for success, 4xx/5xx for error). */
  code: number;
  /** Human-readable message (e.g., "Added successfully", "Quiz already in collection"). */
  message: string;
}

/**
 * Response from a bulk add operation.
 * The backend returns addedCount; individual results are inferred.
 */
export interface BulkAddResult {
  /** Number of quizzes successfully added. */
  addedCount: number;
  /** Total quizzes in the request. */
  totalRequested: number;
}

/**
 * Response from a bulk remove operation.
 * The backend returns removedCount; individual results are inferred.
 */
export interface BulkRemoveResult {
  /** Number of quizzes successfully removed. */
  removedCount: number;
  /** Total quizzes in the request. */
  totalRequested: number;
}

// ─── Bulk Payloads ────────────────────────────────────────────────────────────

/**
 * Validated payload for bulk adding quizzes to a collection.
 * Enforces the 1-100 quiz IDs constraint at the type level via JSDoc.
 *
 * @maxItems 100
 * @minItems 1
 */
export type BulkAddQuizzesPayload = BulkAddBookmarksDto;

/**
 * Validated payload for bulk removing quizzes from a collection.
 * Enforces the 1-100 quiz IDs constraint at the type level via JSDoc.
 *
 * @maxItems 100
 * @minItems 1
 */
export type BulkRemoveQuizzesPayload = BulkRemoveBookmarksDto;

// ─── Collection Analytics ──────────────────────────────────────────────────────

/**
 * Analytics data for the collection detail analytics panel.
 * Derived from `BookmarkCollectionAnalyticsResponseDto` with flattened summary.
 */
export interface CollectionAnalytics {
  /** Collection identifier. */
  collectionId: string;
  /** Collection name. */
  collectionName: string;
  /** Total number of bookmarks in the collection. */
  totalBookmarks: number;
  /** Number of unique quizzes bookmarked in the collection. */
  totalQuizzes: number;
  /** Average rating across all quizzes in the collection (0–5 scale). */
  averageQuizRating: number;
  /** Number of distinct categories represented across the bookmarks. */
  uniqueCategories: number;
  /** Number of distinct tags represented across the bookmarks. */
  uniqueTags: number;
  /** ISO 8601 timestamp when these analytics were last computed. */
  lastUpdated: string;
}

/**
 * Maps `BookmarkCollectionAnalyticsResponseDto` to `CollectionAnalytics`.
 */
export function toCollectionAnalytics(
  dto: BookmarkCollectionAnalyticsResponseDto,
): CollectionAnalytics {
  return {
    collectionId: dto.collectionId,
    collectionName: dto.collectionName,
    totalBookmarks: dto.summary.totalBookmarks,
    totalQuizzes: dto.summary.totalQuizzes,
    averageQuizRating: dto.summary.averageQuizRating,
    uniqueCategories: dto.summary.uniqueCategories,
    uniqueTags: dto.summary.uniqueTags,
    lastUpdated: dto.lastUpdated,
  };
}

// ─── SWR Key Factories ────────────────────────────────────────────────────────

/**
 * SWR key for the collection quizzes list (cursor-paginated).
 * Includes the collectionId to scope to a specific collection.
 */
export function collectionQuizzesKey(collectionId: string) {
  return ['bookmark-collections', 'detail', collectionId, 'quizzes'] as const;
}

/**
 * SWR key for the collection analytics.
 */
export function collectionAnalyticsKey(collectionId: string) {
  return ['bookmark-collections', 'detail', collectionId, 'analytics'] as const;
}

// ─── Validation Constants ─────────────────────────────────────────────────────

/** Maximum number of quiz IDs allowed in a single bulk operation. */
export const BULK_OPERATION_MAX_ITEMS = 100;

/** Minimum number of quiz IDs required in a bulk operation. */
export const BULK_OPERATION_MIN_ITEMS = 1;
