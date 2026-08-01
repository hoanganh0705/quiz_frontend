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

// Epic 3.5 — URL sync hook (TKT-3.5.C2)
export { useQuizFiltersUrlSync } from './useQuizFiltersUrlSync'
