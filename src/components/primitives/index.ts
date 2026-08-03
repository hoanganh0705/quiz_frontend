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

// Epic 3.9 / TKT-3.9.B2 — the follow / unfollow controlled primitive +
// inline notice + loading skeleton. Reused by Story 3.10 (bookmarks).
export { FollowButton, FollowErrorNotice, FollowButtonSkeleton } from './FollowButton'
export type {
  FollowButtonProps,
  FollowErrorNoticeProps,
  FollowButtonSkeletonProps,
} from './FollowButton'

// Epic 3.10 / TKT-3.10.D1 — the bookmark icon button primitive +
// inline error notice. Composed into surfaces by the slot (D4).
export { BookmarkButton, BookmarkButtonErrorNotice, BookmarkButtonSlot } from './BookmarkButton'
export type {
  BookmarkButtonProps,
  BookmarkButtonVariant,
  BookmarkButtonErrorNoticeProps,
  BookmarkButtonSlotProps,
  BookmarkButtonSlotVariant,
} from './BookmarkButton'

// Epic 4.1 / TKT-4.1.D2 — the destructive / state-changing confirm
// dialog primitive. Wraps the shadcn `AlertDialog` under
// `src/components/ui/AlertDialog.tsx` and reads the 5-variant
// vocabulary from `./ConfirmDialog/confirm-copy` (TKT-4.1.D1). Used
// by Phase 4 stories 4.6 (bookmark collection delete), 4.7 (bulk
// bookmark remove), 4.11 (attempt submit-and-complete), 4.13
// (review delete), 4.15 (quiz publish) etc.
export {
  ConfirmDialog } from './ConfirmDialog/ConfirmDialog'
export type { ConfirmDialogProps } from './ConfirmDialog/ConfirmDialog'
export {
  CONFIRM_COPY,
  CONFIRM_KINDS,
  getConfirmCopy,
} from './ConfirmDialog/confirm-copy'
export type {
  ConfirmKind,
  ConfirmCopy,
  ConfirmTone,
} from './ConfirmDialog/confirm-copy'

// Epic 4.2 / Batch B — shared form atoms. Each atom is a
// `useController`-driven, `FormProvider`-registered input primitive.
// The atoms form the typing + UX foundation that every Phase 4
// authoring form (quiz create, question create, review edit, …) builds
// on. The barrel is co-located with the components so the import path
// mirrors `@/components/ui` for the shadcn primitives.
export {
  TextField,
  RichTextArea,
  TagMultiSelect,
  DifficultySelect,
  QuestionTypeSelect,
  QUESTION_TYPE_VALUES,
  ImageUploadField,
  // TKT-4.2.C1 — top-of-form error banner.
  FormErrorBanner,
  // TKT-4.2.C2 — restore-from-draft CTA.
  DraftBanner,
  // TKT-4.2.D2 — per-row bulk-error renderer.
  BulkErrorList,
  // TKT-4.2.E1 — read-only banner.
  ReadOnlyBanner,
} from './form'
export type {
  TextFieldProps,
  RichTextAreaProps,
  TagMultiSelectProps,
  DifficultySelectProps,
  QuestionTypeSelectProps,
  QuestionType,
  ImageUploadFieldProps,
  FormErrorBannerProps,
  DraftBannerProps,
  BulkErrorListProps,
  ReadOnlyBannerProps,
} from './form'