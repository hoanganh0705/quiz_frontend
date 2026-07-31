'use client'

/**
 * <QuizCardGrid /> — responsive grid wrapper for QuizCard / QuizCardSkeleton lists.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.C3.
 *
 * Renders a CSS-grid container with token-based breakpoints:
 *   - mobile (default): 1 column
 *   - sm: 2 columns
 *   - lg: 3 columns
 *   - xl: 4 columns
 *
 * `items` and `skeletonCount` are mutually exclusive in their effect:
 *   - When `items` is non-empty, the grid renders those resolved cards.
 *   - When `items` is empty AND `skeletonCount > 0`, the grid renders
 *     `skeletonCount` skeletons.
 *   - When both are provided, the resolved list takes precedence.
 */

import { QuizCard } from './QuizCard'
import { QuizCardSkeleton } from './QuizCardSkeleton'
import { cn } from '@/shared/utils/merge-class-names'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

const GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export interface QuizCardGridProps<T = QuizListItemDto> {
  items?: readonly T[]
  /** Maps each item to a QuizListItemDto-equivalent value. */
  toQuiz?: (item: T) => QuizListItemDto
  skeletonCount?: number
  className?: string
}

export function QuizCardGrid<T = QuizListItemDto>({
  items,
  toQuiz,
  skeletonCount = 0,
  className
}: QuizCardGridProps<T>) {
  const hasItems = Array.isArray(items) && items.length > 0

  if (hasItems) {
    const mapper = toQuiz ?? ((x: unknown) => x as QuizListItemDto)
    return (
      <div className={cn(GRID, className)} data-testid='quiz-card-grid'>
        {items.map((item) => (
          <QuizCard key={mapper(item).quizId} quiz={mapper(item)} />
        ))}
      </div>
    )
  }

  if (skeletonCount > 0) {
    return (
      <div
        className={cn(GRID, className)}
        data-testid='quiz-card-grid-skeletons'
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <QuizCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return <div className={cn(GRID, className)} data-testid='quiz-card-grid' />
}