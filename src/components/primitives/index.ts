/**
 * Phase 3 design-system primitives barrel.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1 (lines 104–176).
 * Source ticket: TKT-3.1.B1.
 *
 * This barrel re-exports the three Phase 3 primitives (QuizCard, TagPill,
 * CategoryCard) and their skeleton variants so that consumers across the
 * phase can import them from a single stable path:
 *
 *   import { QuizCard, QuizCardSkeleton, TagPill } from '@/components/primitives';
 *
 * It is intentionally separate from `src/components/ui/`, which holds the
 * lower-level shadcn primitives (Skeleton, Button, Card, EmptyState, …)
 * that these components are built on. See TKT-3.1.A2 evidence.
 *
 * Exports are appended as each primitive lands in batches C, D, E.
 */

// ─── Per-primitive exports ───────────────────────────────────────────────
// Source story: PHASE_3_EPICS.md → Story 3.1.
// Source tickets: TKT-3.1.C1 (QuizCard), TKT-3.1.C2 (QuizCardSkeleton),
//                 TKT-3.1.C3 (QuizCardGrid), TKT-3.1.D1 (TagPill).
//
// Each primitive ships as part of Phase 3's public design-system surface.
// TagPill ships in Batch D; CategoryCard in Batch E.

export { QuizCard } from './QuizCard/QuizCard'
export type { QuizCardProps } from './QuizCard/QuizCard'

export { QuizCardSkeleton } from './QuizCard/QuizCardSkeleton'
export type { QuizCardSkeletonProps } from './QuizCard/QuizCardSkeleton'

export { QuizCardGrid } from './QuizCard/QuizCardGrid'
export type { QuizCardGridProps } from './QuizCard/QuizCardGrid'

export { TagPill } from './TagPill/TagPill'
export type { TagPillProps, TagPillVariant } from './TagPill/TagPill'

export { CategoryCard } from './CategoryCard/CategoryCard'
export type { CategoryCardProps } from './CategoryCard/CategoryCard'

export { CategoryCardSkeleton } from './CategoryCard/CategoryCardSkeleton'
export type { CategoryCardSkeletonProps } from './CategoryCard/CategoryCardSkeleton'

export { CategoryCardGrid } from './CategoryCard/CategoryCardGrid'

// Phase-3 reusable primitives introduced by Epic 3.4 (TKT-3.4.C2 /
// TKT-3.4.C6). Exported as named exports so the strips + analytics
// panel can import them from the same stable barrel as the rest of
// the design-system primitives. Future phases (3.6 quiz analytics,
// 3.7 home rails) reuse these primitives.
export { TagPillSkeleton } from './TagPill/TagPillSkeleton'
export type { TagPillSkeletonProps } from './TagPill/TagPillSkeleton'

export { Sparkline } from './Sparkline'
export type { SparklineProps } from './Sparkline'
export type { CategoryCardGridProps } from './CategoryCard/CategoryCardGrid'

// Epic 3.5 / TKT-3.5.C3 — the cross-feature filter slot primitive.
export { FilterBar } from './FilterBar'
export type { FilterBarProps } from './FilterBar'