'use client'

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