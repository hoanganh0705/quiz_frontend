// Categories components - public API surface
export { default as QuizCategoriesCard } from './QuizCategoriesCard'
export { default as TestKnowledge } from './TestKnowledge'
export { default as QuizCategories } from './QuizCategories'

// Epic 3.3 — read-only category browse + detail.
export { CategoryCard } from './CategoryCard'
export type { CategoryCardProps } from './CategoryCard'

export { TrendingCategoriesStrip } from './TrendingCategoriesStrip'

export { CategoryHeader } from './CategoryHeader'
export type { CategoryHeaderProps } from './CategoryHeader'

export { CategoryEmptyState } from './CategoryEmptyState'
export type { CategoryEmptyStateProps } from './CategoryEmptyState'

export { CategoryQuizGrid } from './CategoryQuizGrid'

export { CategoriesDirectoryPage } from './CategoriesDirectoryPage'

export { CategoryDetailPage } from './CategoryDetailPage'

// Epic 3.9 — TKT-3.9.B5 — the per-feature follow button slot wired to
// `useIsFollowingCategory` + `useFollowCategory` + `useUnfollowCategory`.
export { CategoryFollowButtonSlot } from './CategoryFollowButtonSlot'
export type { CategoryFollowButtonSlotProps } from './CategoryFollowButtonSlot'

