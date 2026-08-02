// Tags components barrel — public API surface.
//
// Re-exports every component under `features/tags/components/` so
// consumers can import them from `@/features/tags` without reaching
// into the components directory.
//
// Source epic: Epic 3.4 — Tag browse + detail (read-only).
// Source tickets: TKT-3.4.C1, C2, C3, C4, C5, C6, C7, D1, D2, D3, F2.

// Presentational sub-components (Batch C).
export { TagFilterInput } from './TagFilterInput'
export type { TagFilterInputProps } from './TagFilterInput'

export { PopularTagsStrip } from './PopularTagsStrip'

export { TrendingTagsStrip } from './TrendingTagsStrip'

export { RelatedTagsStrip } from './RelatedTagsStrip'
export type { RelatedTagsStripProps } from './RelatedTagsStrip'

export { TagBreadcrumb } from './TagBreadcrumb'
export type { TagBreadcrumbProps } from './TagBreadcrumb'

export { TagHeader } from './TagHeader'
export type { TagHeaderProps } from './TagHeader'

export { TagAnalyticsPanel } from './TagAnalyticsPanel'
export type { TagAnalyticsPanelProps } from './TagAnalyticsPanel'

export { TagEmptyState } from './TagEmptyState'
export type { TagEmptyStateProps, TagEmptyStateVariant } from './TagEmptyState'

// Composite page components (Batch D).
export { TagQuizGrid } from './TagQuizGrid'
export type { TagQuizGridProps } from './TagQuizGrid'

export { TagsDirectoryPage } from './TagsDirectoryPage'

export { TagDetailPage } from './TagDetailPage'
export type { TagDetailPageProps } from './TagDetailPage'

// Epic 3.9 — TKT-3.9.B5 — the per-feature follow button slot wired to
// `useIsFollowingTag` + `useFollowTag` + `useUnfollowTag`.
export { TagFollowButtonSlot } from './TagFollowButtonSlot'
export type { TagFollowButtonSlotProps } from './TagFollowButtonSlot'

// Epic 3.9 — TKT-3.9.D2 — the route-level SWR hydration shim. The
// hydrator mounts `useFollowedLookup()` at the top of the public
// layout so the lookup's SWR cache is populated on the first
// authenticated render.
export { FollowedLookupHydrator } from './FollowedLookupHydrator'
