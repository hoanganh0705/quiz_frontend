import type {
  SearchQuizResultDto,
  SearchUserResultDto,
  SearchTagResultDto,
  SearchCommentResultDto,
  SearchCategoryResultDto,
} from "@/lib/api/generated/schemas";

export type SearchResultKind =
  | "quiz"
  | "user"
  | "tournament"
  | "achievement"
  | "ranking"
  | "tag"
  | "category"
  | "comment"
  | "social";

export type SearchVisibility = "public" | "authenticated" | "private";

export interface SearchQueryParams {
  q: string;

  limit?: number;

  kinds?: SearchResultKind[];
}

export const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

export const DEFAULT_SEARCH_QUERY_PARAMS: SearchQueryParams = {
  q: "",
  limit: undefined,
  kinds: undefined,
};

export interface BaseSearchResult {
  id: string;

  displayName: string;

  subtitle?: string;

  href: string;

  visibility: SearchVisibility;
}

export type QuizResultDto = BaseSearchResult &
  Omit<SearchQuizResultDto, "quizId"> & {
    id: string;
  };

export type UserResultDto = BaseSearchResult &
  Omit<SearchUserResultDto, "userId"> & {
    id: string;
  };

export interface TournamentResultDto extends BaseSearchResult {
  id: string;

  status?: string;

  participantCount?: number;
}

export interface AchievementResultDto extends BaseSearchResult {
  id: string;

  tier?: string;
}

export interface RankingResultDto extends BaseSearchResult {
  id: string;

  rank?: number;

  score?: number;
}

export type TagResultDto = BaseSearchResult &
  Omit<SearchTagResultDto, "tagId"> & {
    id: string;
  };

export type CategoryResultDto = BaseSearchResult &
  Omit<SearchCategoryResultDto, "categoryId"> & {
    id: string;
  };

export type CommentResultDto = BaseSearchResult &
  Omit<SearchCommentResultDto, "commentId"> & {
    id: string;
  };

export interface SocialReadResultDto extends BaseSearchResult {
  id: string;

  displayName: string;

  avatarUrl?: string;
}

export interface SearchGroup<T> {
  kind: SearchResultKind;

  items: readonly T[];

  visibility: SearchVisibility;
}

export type SearchResultDto =
  | SearchGroup<QuizResultDto>
  | SearchGroup<UserResultDto>
  | SearchGroup<TournamentResultDto>
  | SearchGroup<AchievementResultDto>
  | SearchGroup<RankingResultDto>
  | SearchGroup<TagResultDto>
  | SearchGroup<CategoryResultDto>
  | SearchGroup<CommentResultDto>
  | SearchGroup<SocialReadResultDto>;

export interface SearchResponseDto {
  query: string;

  groups: Partial<Record<SearchResultKind, SearchGroup<unknown>>>;

  tookMs?: number;

  cursor?: string;
}

export type SearchErrorCode =
  | "SEARCH_QUERY_TOO_SHORT"
  | "SEARCH_QUERY_TOO_LONG"
  | "SEARCH_RATE_LIMITED"
  | "SEARCH_BACKEND_UNAVAILABLE"
  | "SEARCH_INVALID_QUERY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_INTERNAL_ERROR";

export type SearchQueryState =
  "idle" | "debouncing" | "fetching" | "success" | "stale" | "error" | "empty";

export interface SearchHistoryEntry {
  query: string;

  timestamp: number;
}
