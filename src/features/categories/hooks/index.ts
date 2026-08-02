// Categories hooks - public API surface.
//
// Re-exports every hook in `features/categories/hooks/` so consumers
// can import them from `@/features/categories` without reaching into
// the hooks directory.
//
// Source epic: Epic 3.3 — Category browse + detail (read-only).
// Source ticket: TKT-3.3.B1 + TKT-3.3.B2 + TKT-3.3.B3 + TKT-3.3.B4.
//
// Story 3.9 follow-ups:
//   - TKT-3.9.B3 — `useIsFollowingCategory` (membership check).
//   - TKT-3.9.B4 — `useFollowCategory` / `useUnfollowCategory`
//     (action hooks).

export { useCategoriesRanked } from './useCategoriesRanked'
export type {
  UseCategoriesRankedParams,
  UseCategoriesRankedResult,
} from './useCategoriesRanked'

export { useCategoriesTrending } from './useCategoriesTrending'
export type {
  UseCategoriesTrendingParams,
  UseCategoriesTrendingResult,
} from './useCategoriesTrending'

export { useCategory } from './useCategory'
export type { UseCategoryResult } from './useCategory'

export { useCategoryQuizzes } from './useCategoryQuizzes'
export type { UseCategoryQuizzesParams } from './useCategoryQuizzes'

// Story 3.9 / TKT-3.9.B3 — the category-side membership check.
export { useIsFollowingCategory } from './useIsFollowingCategory'
export type { UseIsFollowingCategoryResult } from './useIsFollowingCategory'

// Story 3.9 / TKT-3.9.B4 — the per-feature action hooks (category side).
export { useFollowCategory } from './useFollowCategory'
export type { UseFollowCategoryResult } from './useFollowCategory'
export { useUnfollowCategory } from './useUnfollowCategory'
export type { UseUnfollowCategoryResult } from './useUnfollowCategory'
