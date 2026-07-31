/**
 * <QuizCardSkeleton /> — loading-state placeholder for <QuizCard />.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.C2.
 *
 * Outer dimensions mirror <QuizCard />'s so consumers can swap one for
 * the other without causing CLS. The cover block, title row, description
 * row, and metadata row all reserve the same height as the resolved card.
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/shared/utils/merge-class-names'

const CARD_OUTER =
  'flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm'
const COVER = 'aspect-[16/9] w-full rounded-none'
const BODY = 'flex flex-1 flex-col gap-2 p-4'
const META_ROW = 'mt-auto flex items-center gap-2'

export type QuizCardSkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function QuizCardSkeleton({
  className,
  ...rest
}: QuizCardSkeletonProps) {
  return (
    <div
      role='status'
      aria-label='Loading quiz card'
      data-testid='quiz-card-skeleton'
      className={cn(CARD_OUTER, className)}
      {...rest}
    >
      <Skeleton className={COVER} />
      <div className={BODY}>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
        <div className={META_ROW}>
          <Skeleton className='h-4 w-16 rounded-full' />
          <Skeleton className='ml-auto h-3 w-12' />
        </div>
      </div>
    </div>
  )
}