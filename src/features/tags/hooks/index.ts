// Tags hooks barrel — public API surface.
//
// Re-exports every hook under `features/tags/hooks/` so consumers
// can import them from `@/features/tags` without reaching into the
// hooks directory.
//
// Source epic: Epic 3.4 — Tag browse + detail (read-only).
// Source tickets: TKT-3.4.B1, B2, B3, B4, B5.

export { useTagsPopular } from './useTagsPopular'
export type {
  UseTagsPopularParams,
  UseTagsPopularResult,
} from './useTagsPopular'

export { useTagsTrending } from './useTagsTrending'
export type {
  UseTagsTrendingParams,
  UseTagsTrendingResult,
} from './useTagsTrending'

export { useTagBySlug } from './useTagBySlug'
export type { UseTagBySlugResult } from './useTagBySlug'

export { useTagQuizzes } from './useTagQuizzes'
export type { UseTagQuizzesParams } from './useTagQuizzes'

export { useTagRelated } from './useTagRelated'
export type {
  UseTagRelatedParams,
  UseTagRelatedResult,
} from './useTagRelated'

export { useTagAnalytics } from './useTagAnalytics'
export type { UseTagAnalyticsResult } from './useTagAnalytics'

export { useTagsDirectory } from './useTagsDirectory'
export type { UseTagsDirectoryQuery } from './useTagsDirectory'
