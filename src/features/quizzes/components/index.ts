// Quizzes components - public API surface
export { default as QuizCatalogMainContent } from './QuizCatalogMainContent'
export { default as QuizCard, QuizCardDifficulty, QuizCardDetail } from './QuizCard'
export type { QuizCardDifficultyProps as QuizCardProps } from './QuizCard/QuizCardDifficulty'
export { default as PlayQuizClient } from './PlayQuizClient'

// Migrated from homepage
export { default as FeaturedQuiz } from './FeaturedQuiz'
export { default as QuizCardDifficultyList } from './QuizCardDifficultyList'

// Epic 3.5 — Global quizzes directory composition (TKT-3.5.D1).
export { QuizzesDirectoryPage } from './QuizzesDirectoryPage'
export type { QuizzesDirectoryPageProps } from './QuizzesDirectoryPage'

export { QuizGridEmpty } from './QuizGridEmpty'
export type {
  QuizGridEmptyProps,
  QuizGridEmptyVariant
} from './QuizGridEmpty'

export { QuizGridLoadMore } from './QuizGridLoadMore'
export type { QuizGridLoadMoreProps } from './QuizGridLoadMore'

// Epic 3.6 — Quiz detail (player view) + stats
// (TKT-3.6.C1, C2, C3, C4, D1, D2, E1, E2, E3)
export { QuizHeader } from './QuizHeader'
export type { QuizHeaderProps } from './QuizHeader'
export { QuizByline } from './QuizByline'
export type { QuizBylineProps, PublicAuthorSummary } from './QuizByline'
export { QuizMetadataRow } from './QuizMetadataRow'
export type { QuizMetadataRowProps } from './QuizMetadataRow'
export { QuizDescription } from './QuizDescription'
export type { QuizDescriptionProps } from './QuizDescription'
export { QuizQuestionCard } from './QuizQuestionCard'
export type { QuizQuestionCardProps } from './QuizQuestionCard'
export { QuizQuestionList } from './QuizQuestionList'
export type { QuizQuestionListProps } from './QuizQuestionList'
export { QuizStatsPanel, QuizStatsPanelSkeleton } from './QuizStatsPanel'
export type {
  QuizStatsPanelProps,
  QuizStatsPanelSkeletonProps
} from './QuizStatsPanel'
export { QuizCtaStrip, QUIZ_START_ATTEMPT_TOOLTIP } from './QuizCtaStrip'
export type { QuizCtaStripProps } from './QuizCtaStrip'
export { QuizRelatedQuizzesSlot } from './QuizRelatedQuizzesSlot'
export type { QuizRelatedQuizzesSlotProps } from './QuizRelatedQuizzesSlot'
export { QuizDetailPageSkeleton } from './QuizDetailPageSkeleton'
export { QuizDetailPage } from './QuizDetailPage'
export type { QuizDetailPageProps } from './QuizDetailPage'
