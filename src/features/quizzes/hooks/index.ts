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
