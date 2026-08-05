/**
 * Search types — Story 5.6 barrel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.A1.
 *
 * Re-exports the public surface of the search types module so consumers
 * can import from a stable path without reaching into
 * `./search.types` directly.
 *
 * Mirrors the `@/features/notifications/types` and `@/features/tournaments/types`
 * barrel conventions.
 */

export {
  DEFAULT_SEARCH_QUERY_PARAMS,
  EMPTY_SEARCH_RESPONSE,
  SEARCH_CACHE_KEYS,
  serializeSearchParams,
} from "./search.types";

export type {
  AchievementResultDto,
  CategoryResultDto,
  CommentResultDto,
  QuizResultDto,
  RankingResultDto,
  SearchErrorCode,
  SearchGroup,
  SearchHistoryEntry,
  SearchQueryParams,
  SearchQueryState,
  SearchResponseDto,
  SearchResultDto,
  SearchResultKind,
  SearchVisibility,
  SocialReadResultDto,
  TagResultDto,
  TournamentResultDto,
  UserResultDto,
} from "./search.types";