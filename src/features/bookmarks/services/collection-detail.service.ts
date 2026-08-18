

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

export interface ListCollectionQuizzesResponse {

quizzes: CollectionQuiz[];

nextCursor: string | null;

hasMore: boolean;
}

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

export class BulkOperationValidationError extends Error {
constructor(message: string) {
super(message);
this.name = 'BulkOperationValidationError';
  }
}

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

export async function getCollectionAnalyticsData(
collectionId: string,
): Promise<CollectionAnalytics> {
const response = (await getCollectionAnalytics(collectionId)) as unknown as BookmarkCollectionAnalyticsResponseDto;
return toCollectionAnalytics(response);
}
