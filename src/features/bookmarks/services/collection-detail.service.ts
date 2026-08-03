/**
 * `collection-detail.service.ts` — Epic 4.7 collection detail service layer.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B1-2.
 *
 * ## Pattern: thin pass-through to bookmarks.service.ts
 *
 * This module wraps the existing `bookmarks.service.ts` functions with
 * Epic 4.7-specific types and helper functions. The pattern follows the
 * existing codebase: thin pass-through to SDK, with error propagation.
 *
 * ## Functions
 *
 *   - `listCollectionQuizzesPaginated` — fetches quizzes with cursor pagination support.
 *   - `addQuizzesToCollectionBulk` — typed bulk add with validation.
 *   - `removeQuizzesFromCollectionBulk` — typed bulk remove with validation.
 *   - `getCollectionAnalyticsData` — fetches analytics with typed response.
 *
 * @see bookmarks.service.ts — base service layer
 */

import {
  addBookmarksBulk,
  removeBookmarksBulk,
  getCollectionAnalytics,
  listBookmarksInCollection,
} from '@/features/bookmarks/api';

import type {
  BulkAddBookmarksDto,
  BulkRemoveBookmarksDto,
  BookmarkCollectionAnalyticsResponseDto,
} from '@/lib/api/generated/schemas';

import type {
  CollectionQuiz,
  BulkOperationResult,
  BulkAddResult,
  BulkRemoveResult,
  CollectionAnalytics,
} from '@/features/bookmarks/types';
import {
  toCollectionQuiz,
  toCollectionAnalytics,
  BULK_OPERATION_MAX_ITEMS,
} from '@/features/bookmarks/types';

// ─── Collection Quizzes ───────────────────────────────────────────────────────

/**
 * Response shape from listCollectionQuizzesPaginated.
 */
export interface ListCollectionQuizzesResponse {
  /** Array of quizzes in the collection. */
  quizzes: CollectionQuiz[];
  /** Cursor for the next page, or null if no more pages. */
  nextCursor: string | null;
  /** Whether there are more pages to load. */
  hasMore: boolean;
}

/**
 * Wire response shape from the SDK.
 */
interface BookmarksListResponse {
  data?: {
    items?: Array<Record<string, unknown>>;
  };
  meta?: {
    pagination?: {
      kind: 'cursor';
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
}

/**
 * Fetches paginated quizzes for a collection.
 *
 * Note: The existing `listBookmarksInCollection` doesn't support cursor pagination
 * directly. This wrapper maps the response to our internal shape. If the backend
 * adds cursor pagination to this endpoint, this function can be updated.
 */
export async function listCollectionQuizzesPaginated(
  collectionId: string,
): Promise<ListCollectionQuizzesResponse> {
  const result = (await listBookmarksInCollection(collectionId)) as unknown as BookmarksListResponse;

  const items = (result.data?.items ?? []) as Array<Record<string, unknown>>;
  const quizzes = items.map((item) =>
    toCollectionQuiz(item as unknown as import('@/lib/api/generated/schemas').BookmarkedQuizResponseDto),
  );

  const pagination = result.meta?.pagination;

  return {
    quizzes,
    nextCursor: pagination?.nextCursor ?? null,
    hasMore: pagination?.hasNextPage ?? false,
  };
}

// ─── Bulk Operations ───────────────────────────────────────────────────────────

/**
 * Validation error thrown when bulk operation constraints are violated.
 */
export class BulkOperationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkOperationValidationError';
  }
}

/**
 * Validates that the quizIds array meets bulk operation constraints.
 */
function validateBulkOperation(quizIds: string[]): void {
  if (quizIds.length < 1) {
    throw new BulkOperationValidationError('At least 1 quiz ID is required');
  }
  if (quizIds.length > BULK_OPERATION_MAX_ITEMS) {
    throw new BulkOperationValidationError(
      `Maximum ${BULK_OPERATION_MAX_ITEMS} quiz IDs allowed per operation`,
    );
  }
}

/**
 * Builds per-item results array from bulk operation response.
 * Note: The current backend returns addedCount/removedCount, not per-item results.
 * This function infers per-item success based on counts.
 */
function buildBulkAddResults(
  quizIds: string[],
  response: { addedCount: number },
): BulkOperationResult[] {
  const results: BulkOperationResult[] = [];
  const successCount = Math.min(response.addedCount, quizIds.length);
  const skipCount = quizIds.length - successCount;

  for (let i = 0; i < quizIds.length; i++) {
    const isSuccess = i < successCount;
    results.push({
      index: i,
      quizId: quizIds[i],
      status: isSuccess ? 'success' : 'error',
      code: isSuccess ? 200 : 409,
      message: isSuccess ? 'Added to collection' : 'Quiz already in collection',
    });
  }

  // Handle skipped items (duplicates are silently skipped per API docs)
  // If skipCount > 0, the last skipCount items are duplicates
  for (let i = quizIds.length - skipCount; i < quizIds.length; i++) {
    results[i] = {
      index: i,
      quizId: quizIds[i],
      status: 'error',
      code: 409,
      message: 'Quiz already in collection',
    };
  }

  return results;
}

/**
 * Builds per-item results array from bulk remove operation response.
 */
function buildBulkRemoveResults(
  quizIds: string[],
  response: { removedCount: number },
): BulkOperationResult[] {
  const results: BulkOperationResult[] = [];
  const successCount = Math.min(response.removedCount, quizIds.length);
  const skipCount = quizIds.length - successCount;

  for (let i = 0; i < quizIds.length; i++) {
    const isSuccess = i < successCount;
    results.push({
      index: i,
      quizId: quizIds[i],
      status: isSuccess ? 'success' : 'error',
      code: isSuccess ? 200 : 404,
      message: isSuccess ? 'Removed from collection' : 'Quiz not in collection',
    });
  }

  // Handle skipped items (removing non-existent is a no-op per API docs)
  for (let i = quizIds.length - skipCount; i < quizIds.length; i++) {
    results[i] = {
      index: i,
      quizId: quizIds[i],
      status: 'error',
      code: 404,
      message: 'Quiz not in collection',
    };
  }

  return results;
}

/**
 * Bulk add quizzes to a collection.
 *
 * @param collectionId - The collection UUID.
 * @param quizIds - Array of quiz UUIDs to add (1-100 items).
 * @returns Bulk operation results with per-item status.
 * @throws BulkOperationValidationError if quizIds length is invalid.
 */
export async function addQuizzesToCollectionBulk(
  collectionId: string,
  quizIds: string[],
): Promise<{ results: BulkOperationResult[]; summary: BulkAddResult }> {
  validateBulkOperation(quizIds);

  const payload: BulkAddBookmarksDto = { quizIds };
  const response = await addBookmarksBulk(collectionId, payload);

  const results = buildBulkAddResults(quizIds, { addedCount: response.data?.addedCount ?? 0 });

  return {
    results,
    summary: {
      addedCount: response.data?.addedCount ?? 0,
      totalRequested: quizIds.length,
    },
  };
}

/**
 * Bulk remove quizzes from a collection.
 *
 * @param collectionId - The collection UUID.
 * @param quizIds - Array of quiz UUIDs to remove (1-100 items).
 * @returns Bulk operation results with per-item status.
 * @throws BulkOperationValidationError if quizIds length is invalid.
 */
export async function removeQuizzesFromCollectionBulk(
  collectionId: string,
  quizIds: string[],
): Promise<{ results: BulkOperationResult[]; summary: BulkRemoveResult }> {
  validateBulkOperation(quizIds);

  const payload: BulkRemoveBookmarksDto = { quizIds };
  const response = await removeBookmarksBulk(collectionId, payload);

  const results = buildBulkRemoveResults(quizIds, { removedCount: response.data?.removedCount ?? 0 });

  return {
    results,
    summary: {
      removedCount: response.data?.removedCount ?? 0,
      totalRequested: quizIds.length,
    },
  };
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Fetches analytics data for a collection with typed response.
 *
 * @param collectionId - The collection UUID.
 * @returns Typed analytics data.
 */
export async function getCollectionAnalyticsData(
  collectionId: string,
): Promise<CollectionAnalytics> {
  const response = (await getCollectionAnalytics(collectionId)) as unknown as BookmarkCollectionAnalyticsResponseDto;
  return toCollectionAnalytics(response);
}
