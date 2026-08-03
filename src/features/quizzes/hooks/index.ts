// Quizzes hooks
export { useQuizResults } from './use-quiz-results'
export { useCountdownTimer } from './use-countdown-timer'

// Epic 3.5 — public discovery hooks (TKT-3.5.B1, B2, B3)
export { useQuizzesList } from './useQuizzesList'
export type {
  UseQuizzesListQuery,
  UseQuizzesListResult,
  QuizzesListResponse,
} from './useQuizzesList'
export { useQuizzesPopular } from './useQuizzesPopular'
export type {
  UseQuizzesPopularParams,
  UseQuizzesPopularResult,
} from './useQuizzesPopular'
export { useQuizzesTrending } from './useQuizzesTrending'
export type {
  UseQuizzesTrendingParams,
  UseQuizzesTrendingResult,
} from './useQuizzesTrending'

// Story 3.7 — Featured rail hook (TKT-3.7.C1)
export { useFeaturedQuizzes } from './useFeaturedQuizzes'
export type {
  UseFeaturedQuizzesParams,
  UseFeaturedQuizzesResult,
} from './useFeaturedQuizzes'

// Epic 3.5 — URL sync hook (TKT-3.5.C2)
export { useQuizFiltersUrlSync } from './useQuizFiltersUrlSync'

// Epic 3.6 — Quiz detail (player view) + stats (TKT-3.6.B2 / B3 / B4)
export { useQuizByIdOrSlug } from './useQuizByIdOrSlug'
export type { UseQuizByIdOrSlugResult } from './useQuizByIdOrSlug'
export { useQuizStatsByIdOrSlug } from './useQuizStatsByIdOrSlug'
export type { UseQuizStatsByIdOrSlugResult } from './useQuizStatsByIdOrSlug'
export { useIsBookmarked } from './useIsBookmarked'
export type { UseIsBookmarkedResult } from './useIsBookmarked'

// Story 3.8 — Related quizzes block (TKT-3.8.B1)
export { useQuizRelated, QUIZ_RELATED_LIMIT } from './useQuizRelated'
export type { UseQuizRelatedResult } from './useQuizRelated'

// Epic 4.4 — Authored quizzes list + analytics (TKT-4.4.A2, A3, A4, A5)
export { useMyQuizzes } from './useMyQuizzes'
export type { UseMyQuizzesParams, UseMyQuizzesResult } from './useMyQuizzes'
export { useMyQuizzesDrafts } from './useMyQuizzesDrafts'
export type { UseMyQuizzesDraftsParams, UseMyQuizzesDraftsResult } from './useMyQuizzesDrafts'
export { useMyQuizzesPublished } from './useMyQuizzesPublished'
export type { UseMyQuizzesPublishedParams, UseMyQuizzesPublishedResult } from './useMyQuizzesPublished'
export { useMyQuizzesAnalytics } from './useMyQuizzesAnalytics'
export type { UseMyQuizzesAnalyticsResult } from './useMyQuizzesAnalytics'

// Epic 4.8 — Quiz create form (TKT-4.8-B1, B2, B3)
export { useCreateQuiz } from './useCreateQuiz'
export type {
  UseCreateQuizOptions,
  UseCreateQuizReturn,
} from './useCreateQuiz'
export { useCheckQuizSlug } from './useCheckQuizSlug'
export type { UseCheckQuizSlugReturn } from './useCheckQuizSlug'
export { useTagSlugsToIds } from './useTagSlugsToIds'
export type { UseTagSlugsToIdsReturn } from './useTagSlugsToIds'

// Epic 4.9 — Quiz version lifecycle + edit version metadata (TKT-4.9.1, 4.9.2, 4.9.3, 4.9.4, 4.9.5)
export { useQuizAuthorView } from './useQuizAuthorView'
export type { UseQuizAuthorViewResult } from './useQuizAuthorView'
export { useQuizVersions } from './useQuizVersions'
export type {
  UseQuizVersionsParams,
  UseQuizVersionsResult,
} from './useQuizVersions'
export { useQuizVersion } from './useQuizVersion'
export type { UseQuizVersionResult } from './useQuizVersion'
export { useCreateVersion } from './useCreateVersion'
export type {
  UseCreateVersionOptions,
  UseCreateVersionReturn,
} from './useCreateVersion'
export { useUpdateVersion } from './useUpdateVersion'
export type {
  UseUpdateVersionOptions,
  UseUpdateVersionReturn,
} from './useUpdateVersion'
