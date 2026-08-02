// Tags hooks barrel — public API surface.
//
// Re-exports every hook under `features/tags/hooks/` so consumers
// can import them from `@/features/tags` without reaching into the
// hooks directory.
//
// Source epic: Epic 3.4 — Tag browse + detail (read-only).
// Source tickets: TKT-3.4.B1, B2, B3, B4, B5.
//
// Story 3.9 follow-ups:
//   - TKT-3.9.B3 — `useFollowedLookup` (shared with categories).
//   - TKT-3.9.B3 — `useIsFollowingTag` (tag-side membership check).
//   - TKT-3.9.B4 — `useFollowTag` / `useUnfollowTag` (action hooks).

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

// Story 3.9 / TKT-3.9.B3 — the user-scoped `me/followed` lookup.
// Lives under `tags/` because the lookup is shared with categories
// (the cross-feature shared location mirrors how `useAuthState`
// lives in `features/auth/`). The category-side membership hook
// imports from this barrel.
export {
  useFollowedLookup,
  followedCategoriesKey,
  followedTagsKey,
  FOLLOWED_LOOKUP_LIMIT,
} from './useFollowedLookup'
export type { UseFollowedLookupResult } from './useFollowedLookup'

// Story 3.9 / TKT-3.9.B3 — the tag-side membership check.
export { useIsFollowingTag } from './useIsFollowingTag'
export type { UseIsFollowingTagResult } from './useIsFollowingTag'

// Story 3.9 / TKT-3.9.B4 — the per-feature action hooks (tag side).
export { useFollowTag } from './useFollowTag'
export type { UseFollowTagResult } from './useFollowTag'
export { useUnfollowTag } from './useUnfollowTag'
export type { UseUnfollowTagResult } from './useUnfollowTag'
