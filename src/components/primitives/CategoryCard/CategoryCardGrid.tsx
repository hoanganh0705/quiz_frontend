'use client'

/**
 * <CategoryCardGrid /> — responsive grid wrapper for CategoryCard / CategoryCardSkeleton lists.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.E3 (sibling of QuizCardGrid).
 *
 * Same items-vs-skeleton rule as <QuizCardGrid />: when items is non-empty,
 * the grid renders resolved cards; when items is empty AND skeletonCount > 0,
 * the grid renders skeletonCount skeletons; otherwise the resolved list
 * wins.
 */

import { CategoryCard } from './CategoryCard'
import { CategoryCardSkeleton } from './CategoryCardSkeleton'
import { cn } from '@/shared/utils/merge-class-names'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

const GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export interface CategoryCardGridProps {
  items?: readonly CategoryResponseDto[]
  skeletonCount?: number
  className?: string
}

export function CategoryCardGrid({
  items,
  skeletonCount = 0,
  className
}: CategoryCardGridProps) {
  const hasItems = Array.isArray(items) && items.length > 0

  if (hasItems) {
    return (
      <div className={cn(GRID, className)} data-testid='category-card-grid'>
        {items.map((category) => (
          <CategoryCard key={category.categoryId} category={category} />
        ))}
      </div>
    )
  }

  if (skeletonCount > 0) {
    return (
      <div
        className={cn(GRID, className)}
        data-testid='category-card-grid-skeletons'
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(GRID, className)} data-testid='category-card-grid' />
  )
}