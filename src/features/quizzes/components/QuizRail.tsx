'use client'

/**
 * `<QuizRail />` — horizontal-scroller or fixed-grid layout shell
 * for the Story 3.7 home-page rails.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B3.
 *
 * A single-responsibility layout primitive that the three rails (the
 * featured rail — grid layout; the trending rail — scroller layout;
 * the popular rail — scroller layout) compose. The rail owns only
 * the section shell + header row + layout choice. It does NOT own
 * loading / empty / error states — those are passed via `children`.
 *
 * ## Layout choice
 *
 *   - `layout="scroller"` (default) wraps `children` in a horizontal
 *     scroll container with `snap-x snap-mandatory` and
 *     `overflow-x-auto`. Used by the trending + popular rails
 *     (Story 3.7 lines 747, 754, 756).
 *   - `layout="grid"` wraps `children` in a `<QuizCardGrid />` so the
 *     featured rail renders in the established responsive grid.
 *
 * ## Header row
 *
 * The header row positions the rail's `title` (h2) + optional
 * `subtitle` (muted paragraph) on the left and the optional `filter`
 * slot on the right (typically a `<HomeCategoryFilter />` from B2).
 * When `filter` is omitted, the right side is empty — no empty
 * wrapper is rendered, the title block simply spans the row.
 *
 * ## Section semantics
 *
 * The primitive renders a `<section aria-labelledby>` with a
 * generated `headingId`. The `<h2>` carries the same id so the rail
 * is announced as a labelled landmark.
 */

import { useId } from 'react'
import * as React from 'react'

import { cn } from '@/shared/utils/merge-class-names'
import { QuizCardGrid } from '@/components/primitives/QuizCard/QuizCardGrid'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

export type QuizRailLayout = 'scroller' | 'grid'

export interface QuizRailProps<T = QuizListItemDto> {
  /** Rail heading rendered as `<h2>`. */
  title: string
  /** Optional paragraph below the heading. */
  subtitle?: string
  /**
   * Optional right-aligned slot (e.g. a `<HomeCategoryFilter />`).
   * When omitted, the right side renders nothing.
   */
  filter?: React.ReactNode
  /**
   * Rail content. The parent picks what goes in here — resolved
   * `<QuizCard />`s, `<QuizCardSkeleton />` placeholders, or a
   * `<QuizRailEmpty />` panel.
   */
  children: React.ReactNode
  /**
   * Layout choice:
   *   - `'scroller'` (default) — horizontal-scroll container.
   *   - `'grid'` — `<QuizCardGrid items={items} />` wrapper (featured).
   */
  layout?: QuizRailLayout
  /**
   * Used only when `layout="grid"`. The parent projects each item to
   * a `QuizListItemDto`-shaped value before the grid renders it.
   */
  gridItems?: readonly T[]
  /** Mapper from `<T>` to a `QuizListItemDto`. Required for `'grid'` items. */
  toQuiz?: (item: T) => QuizListItemDto
  className?: string
}

const SCROLLER_OUTER =
  'flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory pb-2'
// Each card reserves ~280px so users see ~3.5 cards at a time on a
// desktop and can swipe on mobile. The actual sizing is owned by
// `<QuizCard />`'s responsive classes.
const SCROLLER_CARD =
  'snap-start shrink-0 basis-[260px] sm:basis-[280px]'

export function QuizRail<T = QuizListItemDto>({
  title,
  subtitle,
  filter,
  children,
  layout = 'scroller',
  gridItems,
  toQuiz,
  className,
}: QuizRailProps<T>): React.ReactElement {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      data-testid='quiz-rail'
      data-layout={layout}
      className={cn('flex flex-col gap-3', className)}
    >
      <header className='flex flex-wrap items-end justify-between gap-3'>
        <div className='flex flex-col'>
          <h2
            id={headingId}
            className='text-xl font-semibold tracking-tight text-foreground sm:text-2xl'
          >
            {title}
          </h2>
          {subtitle ? (
            <p className='text-sm text-muted-foreground'>{subtitle}</p>
          ) : null}
        </div>
        {filter ? (
          <div data-testid='quiz-rail-filter-slot'>{filter}</div>
        ) : null}
      </header>

      {layout === 'grid' ? (
        <QuizCardGrid
          items={gridItems}
          toQuiz={toQuiz as never}
        />
      ) : (
        <div className={SCROLLER_OUTER} data-testid='quiz-rail-scroller'>
          {/* The rails map children individually (cards, skeletons, or
              the empty panel) so we wrap the children in a single
              scroller container. */}
          {wrapChildrenInScroller(children)}
        </div>
      )}
    </section>
  )
}

/**
 * Wrap each top-level child in a `<div>` that reserves the scroller
 * card width so individual skeleton / empty placements line up with
 * resolved cards. Consumers that pass an array of `<QuizCard />`s
 * already get the width for free because their internal layout
 * already reserves space.
 */
function wrapChildrenInScroller(
  children: React.ReactNode,
): React.ReactElement {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={SCROLLER_CARD}
          data-testid='quiz-rail-scroller-cell'
        >
          {child}
        </div>
      ))}
    </>
  )
}
