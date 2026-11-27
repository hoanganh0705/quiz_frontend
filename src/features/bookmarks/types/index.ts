import type {
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
} from "@/lib/api/generated/schemas";

export type BookmarkFilter = "all" | "recent" | "easy" | "medium" | "hard";

export type BookmarkSortOption =
  "newest" | "oldest" | "name-asc" | "name-desc" | "difficulty";

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
} from "@/lib/api/generated/schemas";

export type {
  BookmarkControllerListCollectionsResult,
  BookmarkControllerCreateCollectionResult,
  BookmarkControllerListBookmarksInCollectionResult,
  BookmarkControllerUpdateCollectionResult,
  BookmarkControllerDeleteCollectionResult,
  BookmarkControllerAddBookmarkResult,
  BookmarkControllerRemoveBookmarkResult,
} from "@/lib/api/generated/bookmarks/bookmarks";

export const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280", // gray
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

export interface CollectionColorClasses {
  readonly badgeBg: string;
  readonly iconText: string;
  readonly accentBar: string;
}

const DEFAULT_COLLECTION_COLOR_CLASSES: CollectionColorClasses = {
  badgeBg: "bg-brand/15",
  iconText: "text-brand",
  accentBar: "bg-brand",
};

const PRESET_COLOR_CLASS_MAP: Readonly<Record<string, CollectionColorClasses>> =
  {
    "#ef4444": {
      badgeBg: "bg-red-500/15",
      iconText: "text-red-500",
      accentBar: "bg-red-500",
    },
    "#f97316": {
      badgeBg: "bg-orange-500/15",
      iconText: "text-orange-500",
      accentBar: "bg-orange-500",
    },
    "#eab308": {
      badgeBg: "bg-amber-500/15",
      iconText: "text-amber-500",
      accentBar: "bg-amber-500",
    },
    "#22c55e": {
      badgeBg: "bg-emerald-500/15",
      iconText: "text-emerald-500",
      accentBar: "bg-emerald-500",
    },
    "#14b8a6": {
      badgeBg: "bg-teal-500/15",
      iconText: "text-teal-500",
      accentBar: "bg-teal-500",
    },
    "#3b82f6": {
      badgeBg: "bg-blue-500/15",
      iconText: "text-blue-500",
      accentBar: "bg-blue-500",
    },
    "#8b5cf6": {
      badgeBg: "bg-violet-500/15",
      iconText: "text-violet-500",
      accentBar: "bg-violet-500",
    },
    "#ec4899": {
      badgeBg: "bg-pink-500/15",
      iconText: "text-pink-500",
      accentBar: "bg-pink-500",
    },
    "#6b7280": {
      badgeBg: "bg-muted",
      iconText: "text-muted-foreground",
      accentBar: "bg-muted-foreground",
    },
  };

export function getCollectionColor(collection: BookmarkCollection): string {
  if (
    collection.color &&
    typeof collection.color === "string" &&
    collection.color.length > 0
  ) {
    return collection.color;
  }
  return PRESET_COLORS[hashStringToIndex(collection.collectionId)];
}

export function getCollectionColorClasses(
  collection: BookmarkCollection,
): CollectionColorClasses {
  const resolved = getCollectionColor(collection).trim().toLowerCase();
  return PRESET_COLOR_CLASS_MAP[resolved] ?? DEFAULT_COLLECTION_COLOR_CLASSES;
}

export const BOOKMARK_COLLECTIONS_LOOKUP_KEY = [
  "bookmark-collections-lookup",
] as const;

export type {
  CollectionQuiz,
  BulkOperationResult,
  BulkAddResult,
  BulkRemoveResult,
  CollectionAnalytics,
  BulkAddQuizzesPayload,
  BulkRemoveQuizzesPayload,
} from "./collection-detail.types";
export {
  toCollectionQuiz,
  toCollectionAnalytics,
  collectionQuizzesKey,
  collectionAnalyticsKey,
  BULK_OPERATION_MAX_ITEMS,
  BULK_OPERATION_MIN_ITEMS,
} from "./collection-detail.types";

export type BookmarkedQuiz = BookmarkedQuizResponseDto;
