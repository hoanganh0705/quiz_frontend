// Quizzes components - public API surface
export { default as QuizCatalogMainContent } from './QuizCatalogMainContent'
export { default as QuizCard, QuizCardDifficulty, QuizCardDetail } from './QuizCard'
export type { QuizCardDifficultyProps as QuizCardProps } from './QuizCard/QuizCardDifficulty'
export { default as PlayQuizClient } from './PlayQuizClient'

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
// Story 3.8 — Related quizzes block (TKT-3.8.B2 / B3).
// Live replacement for the legacy `<QuizRelatedQuizzesSlot />`
// placeholder (TKT-3.8.D3 deleted the placeholder file); consumed
// by `<QuizDetailPage />`.
export { QuizRelatedQuizzes } from './QuizRelatedQuizzes'
export type { QuizRelatedQuizzesProps } from './QuizRelatedQuizzes'
export { QuizRelatedQuizzesSkeleton } from './QuizRelatedQuizzesSkeleton'
export type { QuizRelatedQuizzesSkeletonProps } from './QuizRelatedQuizzesSkeleton'
export { QuizDetailPageSkeleton } from './QuizDetailPageSkeleton'
export { QuizDetailPage } from './QuizDetailPage'
export type { QuizDetailPageProps } from './QuizDetailPage'

// Story 3.7 — Featured / trending / popular rails on `/`
// (TKT-3.7.B2 / B3 / B4 / B5 — slot primitives)
export { HomeCategoryFilter, HOME_CATEGORY_FILTER_ALL } from './HomeCategoryFilter'
export type { HomeCategoryFilterProps } from './HomeCategoryFilter'
export { QuizRail } from './QuizRail'
export type { QuizRailProps, QuizRailLayout } from './QuizRail'
export { QuizRailEmpty, QuizRailEmptyActionButton } from './QuizRailEmpty'
export type { QuizRailEmptyProps } from './QuizRailEmpty'
export { QuizRailSkeleton } from './QuizRailSkeleton'
export type { QuizRailSkeletonProps } from './QuizRailSkeleton'

// Story 3.7 — Featured / trending / popular rails on `/`
// (TKT-3.7.C2 / C3 / C4 — rail compositions)
export { HomeFeaturedRail } from './HomeFeaturedRail'
export type { HomeFeaturedRailProps } from './HomeFeaturedRail'
export { HomeTrendingRail } from './HomeTrendingRail'
export type { HomeTrendingRailProps } from './HomeTrendingRail'
export { HomePopularRail } from './HomePopularRail'
export type { HomePopularRailProps } from './HomePopularRail'

// Story 3.7 — Home page composition (TKT-3.7.D1) + route entry
export { HomePage } from './HomePage'
export type { HomePageProps } from './HomePage'

// Epic 4.4 — Authored quizzes list + analytics (TKT-4.4.C1/C2/C3/C4/D1/D2/D3/D4/E1)
export { MyQuizzesSkeleton } from './MyQuizzesSkeleton'
export { MyQuizzesTableEmpty } from './MyQuizzesTableEmpty'
export { MyQuizzesAnalyticsSkeleton } from './MyQuizzesAnalyticsSkeleton'
export { MyQuizzesAnalyticsEmpty } from './MyQuizzesAnalyticsEmpty'
export { MyQuizzesTableRow } from './MyQuizzesTableRow'
export { MyQuizzesTable } from './MyQuizzesTable'
export { MyQuizzesTabs } from './MyQuizzesTabs'
export { MyQuizzesAnalyticsTab } from './MyQuizzesAnalyticsTab'
export { MyQuizzesDashboardPage } from './MyQuizzesDashboardPage'
