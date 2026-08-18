

import type { BookmarkCollectionResponseDto, BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas';

export type BookmarkFilter = 'all' | 'recent' | 'easy' | 'medium' | 'hard';

export type BookmarkSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'difficulty';

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

export const PRESET_COLORS = [
'#ef4444',
'#f97316',
'#eab308',
'#22c55e',
'#14b8a6',
'#3b82f6',
'#8b5cf6',
'#ec4899',
'#6b7280', // gray
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];

export interface BookmarkCollection {

collectionId: string;

id: string;
userId: string;
name: string;
description?: string | null;

color?: string | null;
quizCount: number;
createdAt: string;
updatedAt: string;
}

export function toBookmarkCollection(
dto: BookmarkCollectionResponseDto,
): BookmarkCollection {
return {
collectionId: dto.collectionId,
id: dto.collectionId,
userId: dto.userId,
name: dto.name,
description: dto.description,
color: (dto as unknown as { color?: string | null }).color ?? null,
quizCount: dto.quizCount,
createdAt: dto.createdAt,
updatedAt: dto.updatedAt,
  };
}

function hashStringToIndex(str: string): number {
let hash = 0;
for (let i = 0; i < str.length; i++) {
const char = str.charCodeAt(i);
hash = (hash << 5) - hash + char;
hash = hash & hash; // Convert to 32bit integer
  }
return Math.abs(hash) % PRESET_COLORS.length;
}

export function getCollectionColor(collection: BookmarkCollection): string {
if (collection.color && typeof collection.color === 'string' && collection.color.length > 0) {
return collection.color;
  }
return PRESET_COLORS[hashStringToIndex(collection.collectionId)];
}

export const BOOKMARK_COLLECTIONS_LOOKUP_KEY = ['bookmark-collections-lookup'] as const;

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

export type BookmarkedQuiz = BookmarkedQuizResponseDto;
