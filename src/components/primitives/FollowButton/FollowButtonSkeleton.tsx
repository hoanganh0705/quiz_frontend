

import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';

const OUTER = 'inline-flex h-9 min-w-28 items-center gap-1.5 px-4 rounded-md'

export interface FollowButtonSkeletonProps {
className?: string
}

export function FollowButtonSkeleton({
className,
}: FollowButtonSkeletonProps) {
return (
<div
role='status'
aria-label='Loading follow state'
data-testid='follow-button-skeleton'
className={cn('flex flex-col items-start gap-1', className)}
    >
<Skeleton className={OUTER} />
</div>
  )
}