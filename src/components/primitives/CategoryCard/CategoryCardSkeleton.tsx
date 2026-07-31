'use client'

/**
 * <CategoryCardSkeleton /> — loading-state placeholder for <CategoryCard />.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.E2.
 *
 * Outer dimensions mirror <CategoryCard />'s so consumers can swap one
 * for the other without causing CLS. The cover block uses a 4:3 aspect
 * ratio (matching the resolved card) and the body keeps the same padding.
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/shared/utils/merge-class-names'

const CARD_OUTER =
  'flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm'
const COVER = 'aspect-[4/3] w-full rounded-none'
const BODY = 'flex flex-1 flex-col gap-2 p-4'
const META_ROW = 'mt-auto flex items-center gap-2'

export type CategoryCardSkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function CategoryCardSkeleton({
  className,
  ...rest
}: CategoryCardSkeletonProps) {
  return (
    <div
      role='status'
      aria-label='Loading category card'
      data-testid='category-card-skeleton'
      className={cn(CARD_OUTER, className)}
      {...rest}
    >
      <Skeleton className={COVER} />
      <div className={BODY}>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-2/3' />
        <div className={META_ROW}>
          <Skeleton className='h-3 w-24' />
        </div>
      </div>
    </div>
  )
}