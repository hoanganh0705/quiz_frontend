// Quiz types
// Legacy types (from mock data era) — for backward compat with existing UI
// NOTE: These do NOT match the actual backend API responses
export type {
  QuizDifficulty as QuizDifficultyLegacy,
  QuizCreator as QuizCreatorLegacy,
  QuizAnswerOption as QuizAnswerOptionLegacy,
  QuizQuestion as QuizQuestionLegacy,
  QuizReview as QuizReviewLegacy,
  QuizLeaderboardEntry as QuizLeaderboardEntryLegacy,
  QuizMetadata as QuizMetadataLegacy,
} from './quiz'
export type { Quiz as QuizLegacy } from './quiz'

// Backend-aligned types (for real API integration)
export type {
  QuizDifficulty,
  QuizVersionStatus,
  QuizResponseDto,
  QuizVersionSummaryDto,
  QuizVersionDetailDto,
  QuizQuestionDto,
  QuizAnswerOptionDto,
  QuizListResponse,
  QuizVersionsResponse,
  QuizListItem,
  QuizDetail,
} from './quiz-backend'
export {
  toQuizListItem,
  toQuizDetail,
  toQuizQuestion,
} from './quiz-backend'

// Filter state types (Epic 3.5 / TKT-3.5.A3) — the typed shape that
// round-trips through the URL for the global `/quizzes` directory.
//
// Note: `QuizDifficulty` is already exported above from `./quiz-backend`
// (the SDK-aligned `'easy' | 'medium' | 'hard'` enum). The filter-URL
// layer re-uses that same type — no duplicate definition here.
export type {
  QuizSort,
  QuizDifficultyFilter,
  QuizFilterUrlState,
} from './quiz-filter-params'
export {
  QUIZ_SORT_VALUES,
  TAG_SLUG_REGEX,
  isValidTagSlug,
  parseQuizFilterUrl,
  serializeQuizFilterUrl,
} from './quiz-filter-params'

// Results/History types
export type { QuizResult, QuizProgress, QuestionReview, QuizResultsProps, ScoreHeroProps, StatsOverviewProps, AnswerReviewTabProps, LeaderboardTabProps, ShareResultsTabProps, TimeAnalysisProps, BottomActionsProps, QuestionReviewItemProps, LeaderboardItemProps, SharePreviewProps, ShareButtonsProps, ChallengeFriendsProps, TimeAnalysisItemProps } from './quiz-results'
export type { QuizActivityType, QuizResultStatus, DateRangeFilter, SortOption, QuizHistoryEntry, QuizHistoryStats, CategoryStat, DifficultyBreakdown, WeeklyActivity, MonthlyScoreTrend, QuizHistoryFilters, ExportFormat } from './quiz-history'
