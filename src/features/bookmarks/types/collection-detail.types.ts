

import type {
BookmarkCollectionResponseDto,
BookmarkedQuizResponseDto,
BulkAddBookmarksDto,
BulkRemoveBookmarksDto,
BookmarkCollectionAnalyticsResponseDto,
BookmarkCollectionAnalyticsSummaryDto,
} from '@/lib/api/generated/schemas';

export type {
BookmarkCollectionResponseDto,
BookmarkedQuizResponseDto,
BulkAddBookmarksDto,
BulkRemoveBookmarksDto,
BookmarkCollectionAnalyticsResponseDto,
BookmarkCollectionAnalyticsSummaryDto,
} from '@/lib/api/generated/schemas';

export interface CollectionQuiz {

bookmarkId: string;

id: string;

quizId: string;

quizTitle: string;

quizSlug: string;

quizImageUrl: string | null;

quizIsFeatured: boolean;

notes: string | null;

addedAt: string;

bookmarkedAt: string;
}

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

export type BulkOperationStatus = 'success' | 'error';

export interface BulkOperationResult {

index: number;

quizId: string;

status: BulkOperationStatus;

code: number;

message: string;
}

export interface BulkAddResult {

addedCount: number;

totalRequested: number;
}

export interface BulkRemoveResult {

removedCount: number;

totalRequested: number;
}

export type BulkAddQuizzesPayload = BulkAddBookmarksDto;

export type BulkRemoveQuizzesPayload = BulkRemoveBookmarksDto;

export interface CollectionAnalytics {

collectionId: string;

collectionName: string;

totalBookmarks: number;

totalQuizzes: number;

averageQuizRating: number;

uniqueCategories: number;

uniqueTags: number;

lastUpdated: string;
}

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

export function collectionQuizzesKey(collectionId: string) {
return ['bookmark-collections', 'detail', collectionId, 'quizzes'] as const;
}

export function collectionAnalyticsKey(collectionId: string) {
return ['bookmark-collections', 'detail', collectionId, 'analytics'] as const;
}

export const BULK_OPERATION_MAX_ITEMS = 100;

export const BULK_OPERATION_MIN_ITEMS = 1;
