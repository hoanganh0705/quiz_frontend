/**
 * `/categories/[idOrSlug]` route loading surface.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.E5 (route skeleton).
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.D3 (follow-slot skeleton parity).
 *
 * The shape mirrors the live detail page (`<CategoryDetailPage />`):
 * the breadcrumb + flex container with `<CategoryHeader />` + the
 * follow-slot placeholder (`<FollowButtonSkeleton />`) + the
 * `<CategoryQuizGrid />` quiz grid skeleton.
 *
 * CLS = 0 once the live page hydrates: every skeleton's outer
 * dimensions match the live component's outer dimensions. The
 * follow-slot skeleton mirrors the resolved follow button's outer
 * dimensions so the slot does not shift on hydration (TKT-3.9.D3
 * AC #1).
 *
 * The component is a server component (no `'use client'`) — Next.js
 * App-Router renders this automatically during the initial
 * navigation + server-side data fetch (the SWR hooks fire after
 * hydration).
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { FollowButtonSkeleton, QuizCardGrid } from '@/components/primitives'

const BREADCRUMB_HEIGHT = 'h-4 w-32'
const HEADER_TITLE_HEIGHT = 'h-9 w-56'
const HEADER_DESCRIPTION_HEIGHT = 'h-5 w-96'
const FOLLOW_SLOT_CONTAINER =
  'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
const GRID_PADDING = 'mt-8'

export default function CategoryDetailLoading() {
  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      aria-busy='true'
      aria-label='Loading category detail page'
      data-testid='category-detail-loading'
    >
      {/* Breadcrumb skeleton */}
      <nav
        aria-label='Loading breadcrumb'
        className='mb-4 flex items-center gap-1'
      >
        <Skeleton className={BREADCRUMB_HEIGHT} />
      </nav>

      {/*
       * Flex container with header skeleton + follow-slot skeleton.
       * The flex layout matches the live page's flex container so
       * the CLS = 0 invariant holds (D3 AC #1): the header takes
       * the primary row, the follow-slot placeholder takes the
       * trailing column at `sm:` and up.
       */}
      <div
        className={FOLLOW_SLOT_CONTAINER}
        data-testid='category-detail-header-skeleton'
      >
        {/* Header skeleton — title + description */}
        <div className='flex-1'>
          <Skeleton className={`${HEADER_TITLE_HEIGHT} mb-2`} />
          <Skeleton className={HEADER_DESCRIPTION_HEIGHT} />
        </div>
        {/* Follow-slot skeleton — mirrors the resolved button's outer dimensions */}
        <FollowButtonSkeleton />
      </div>

      {/* Quiz grid skeleton — 12 cards (matches <CategoryQuizGrid />). */}
      <div
        className={GRID_PADDING}
        aria-label='Loading quizzes for this category'
        data-testid='category-detail-grid-skeleton'
      >
        <QuizCardGrid skeletonCount={12} />
      </div>
    </div>
  )
}