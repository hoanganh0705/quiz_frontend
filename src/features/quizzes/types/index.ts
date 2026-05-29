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

// Results/History types
export type { QuizResult, QuizProgress, QuestionReview, QuizResultsProps, ScoreHeroProps, StatsOverviewProps, AnswerReviewTabProps, LeaderboardTabProps, ShareResultsTabProps, TimeAnalysisProps, BottomActionsProps, QuestionReviewItemProps, LeaderboardItemProps, SharePreviewProps, ShareButtonsProps, ChallengeFriendsProps, TimeAnalysisItemProps } from './quiz-results'
export type { QuizActivityType, QuizResultStatus, DateRangeFilter, SortOption, QuizHistoryEntry, QuizHistoryStats, CategoryStat, DifficultyBreakdown, WeeklyActivity, MonthlyScoreTrend, QuizHistoryFilters, ExportFormat } from './quiz-history'
