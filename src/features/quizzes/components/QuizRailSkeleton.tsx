'use client'

/**
 * `<QuizRailSkeleton />` — per-rail loading-state placeholder.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B5.
 *
 * Renders `count` (default 5) `<QuizCardSkeleton />` items inside the
 * rail's layout — a horizontal-scroller container for `'scroller'`
 * rails (trending + popular) or a `<QuizCardGrid />` wrapper for
 * `'grid'` rails (featured).
 *
 * The skeletons' outer dimensions match the resolved `<QuizCard />`
 * dimensions (Story 3.1 C2 + TKT-3.5.D4). The skeleton therefore
 * reserves the same outer height the resolved card will fill — so
 * the rail does not cause CLS on hydration (Story 3.7 AC #3).
 *
 * The skeleton does NOT render the title — the title slot is
 * reserved by the live rail (the user sees the title from the time
 * the rail mounts; the skeleton cards appear in the content area
 * only).
 */

import { Fragment } from 'react'

import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton'
import { QuizCardGrid } from '@/components/primitives/QuizCard/QuizCardGrid'
import { cn } from '@/shared/utils/merge-class-names'

import type { QuizRailLayout } from './QuizRail'

export interface QuizRailSkeletonProps {
  /**
   * Layout choice — mirrors `<QuizRail />`'s `layout`. Defaults to
   * `'scroller'`.
   */
  layout?: QuizRailLayout
  /** Number of skeleton cards. Default 5 per Story 3.7 line 789. */
  count?: number
  className?: string
}

const DEFAULT_COUNT = 5

/**
 * Static class list kept here so the same scroll surface used by
 * the live rail is reused for the skeleton — same outer width per
 * item, same scroll behaviour. CLS = 0 (Story 3.7 AC #3).
 */
const SCROLLER_OUTER =
  'flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory pb-2'
const SCROLLER_CELL = 'snap-start shrink-0 basis-[260px] sm:basis-[280px]'

export function QuizRailSkeleton({
  layout = 'scroller',
  count = DEFAULT_COUNT,
  className,
}: QuizRailSkeletonProps): React.ReactElement {
  const skeletonCount = Math.max(0, count)

  if (layout === 'grid') {
    return (
      <QuizCardGrid
        skeletonCount={skeletonCount}
        className={className}
      />
    )
  }

  return (
    <div
      className={cn(SCROLLER_OUTER, className)}
      data-testid='quiz-rail-skeleton'
      data-layout={layout}
      data-count={skeletonCount}
      aria-busy='true'
      aria-label='Loading quiz rail'
    >
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Fragment key={index}>
          <div className={SCROLLER_CELL}>
            <QuizCardSkeleton />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
