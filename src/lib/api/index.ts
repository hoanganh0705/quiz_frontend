

export { customInstance } from './core/custom-instance';
export { authOnlyInstance } from './core/auth-only-instance';
export { orvalCustomInstance } from './core/custom-instance';

export { ApiError, isApiError } from './core/ApiError';
export type { ApiErrorData } from './core/ApiError';
export type { CustomConfig } from './core/custom-instance';

export { coerceToApiError } from './error-coercion';
export type { ApiErrorInput } from './error-types';

export { appendUniqueById } from './append-unique-by-id';

export {
useCursorPaginated
} from './use-cursor-paginated'
export type {
CursorFetcher,
CursorFetcherArgs,
CursorPage,
CursorPageFallbackData,
CursorParams,
OffsetFetcher,
OffsetFetcherArgs,
OffsetPage,
OffsetPageFallbackData,
OffsetParams,
PaginationKind,
UseCursorPaginatedDefaultParams,
UseCursorPaginatedParams,
UseCursorPaginatedResult
} from './use-cursor-paginated.types'

export {
isCursorPage,
isOffsetPage,
isAnyCursorLikePage,
assertPageShape,
} from './is-cursor-page'

export {
type ProjectWithId,
projectWithId,
} from './project-with-id'

export {
useOffsetPaginated,
FEED_DEFAULT_LIMIT,
FEED_MAX_LIMIT,
} from './use-offset-paginated'
export type {
OffsetPaginatedFetcher,
UseOffsetPaginatedParams,
UseOffsetPaginatedResult,
} from './use-offset-paginated'

export {
useSingleWithRetry
} from './use-single-with-retry'
export type {
SingleFetcher,
UseSingleWithRetryParams,
UseSingleWithRetryResult
} from './use-single-with-retry'

export {
useOptimisticToggle,
classifyOptimisticToggleError
} from './useOptimisticToggle'
export type {
OptimisticToggleError,
OptimisticToggleErrorKind,
OptimisticToggleStatus,
OptimisticToggleSWRKey,
UseOptimisticToggleParams,
UseOptimisticToggleResult
} from './useOptimisticToggle'

export {
useOptimisticMutation,
COOLDOWN_RESULT,
isApiErrorRejection,
} from './useOptimisticMutation'
export type {
OptimisticMutationBroadcast,
OptimisticMutationCall,
OptimisticMutationConfirm,
OptimisticMutationPatcher,
OptimisticMutationResult,
OptimisticMutationRun,
OptimisticMutationStatus,
OptimisticMutationSWRKey,
UseOptimisticMutationResult,
} from './useOptimisticMutation'

export { getSocial } from './generated/social/social';

export { getAttempts } from './generated/attempts/attempts';
export { getAuth } from './generated/auth/auth';
export { getBookmarks } from './generated/bookmarks/bookmarks';
export { getCategories } from './generated/categories/categories';
export { getComments } from './generated/comments/comments';
export { getDailyChallenge } from './generated/daily-challenge/daily-challenge';
export { getHome } from './generated/home/home';
export { getInstances } from './generated/instances/instances';
export { getLeaderboards } from './generated/leaderboards/leaderboards';
export { getAchievements } from './generated/achievements/achievements';
export { getNotifications } from './generated/notifications/notifications';
export { getSearch } from './generated/search/search';
export { getQuizzes } from './generated/quizzes/quizzes';
export { getReviews } from './generated/reviews/reviews';
export { getTags } from './generated/tags/tags';
export { getTournaments } from './generated/tournaments/tournaments';
export { getUsers } from './generated/users/users';
export { getUploads } from './generated/uploads';

export * from './generated/schemas';