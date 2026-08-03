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

// Epic 4.8 — Quiz create form (TKT-4.8-C1/C2/C3/C4)
export { QuizSlugField } from './QuizSlugField'
export { CreateQuizForm, CREATE_QUIZ_FORM_DEFAULT_VALUES } from './CreateQuizForm'
export type { CreateQuizFormProps } from './CreateQuizForm'
export { CreateQuizPage } from './CreateQuizPage'
export { CreateQuizFormSkeleton } from './CreateQuizFormSkeleton'

// Epic 4.9 — Quiz version lifecycle + edit version metadata (TKT-4.9.6, 4.9.7, 4.9.9, 4.9.10, 4.9.11, 4.9.12, 4.9.13, 4.9.14, 4.9.17)
export { QuizEditPage } from './QuizEditPage'
export { QuizEditPageSkeleton } from './QuizEditPageSkeleton'
export { QuizEditHeader } from './QuizEditHeader'
export { QuizVersionTabs } from './QuizVersionTabs'
export { QuizVersionList } from './QuizVersionList'
export { QuizVersionListItem } from './QuizVersionListItem'
export { QuizVersionActionsMenu } from './QuizVersionActionsMenu'
export type { QuizVersionActionsMenuProps } from './QuizVersionActionsMenu'
export { VersionImmutableBanner } from './VersionImmutableBanner'
export { QuizEditForm, QuizEditFormSkeleton } from './QuizEditForm'
export { PublishReadinessBanner } from './PublishReadinessBanner'
export type { PublishReadinessBannerProps } from './PublishReadinessBanner'

// Epic 4.10 — Question Editor (T-4.10.9, T-4.10.10, T-4.10.11, T-4.10.12, T-4.10.13, T-4.10.14, T-4.10.15, T-4.10.16, T-4.10.20)
export { QuestionEditorPage } from './QuestionEditor'
export { QuestionEditor } from './QuestionEditor'
export { QuestionList } from './QuestionEditor'
export { QuestionListItem } from './QuestionEditor'
export { SingleQuestionForm } from './QuestionEditor'
export { BulkQuestionForm } from './QuestionEditor'
export { QuestionTypeSelect } from './QuestionEditor'
export { AnswerOptionsEditor } from './QuestionEditor'
export { QuestionCorrectMark } from './QuestionEditor'
export { PublishReadinessCounter } from './QuestionEditor'
export type {
  QuestionEditorProps,
  QuestionListProps,
  QuestionListItemProps,
  SingleQuestionFormProps,
  BulkQuestionFormProps,
  QuestionTypeSelectProps,
  AnswerOptionsEditorProps,
  QuestionCorrectMarkProps,
  PublishReadinessCounterProps,
} from './QuestionEditor'
