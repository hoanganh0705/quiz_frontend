'use client'

import { LeaderboardRowSkeleton } from '@/components/ui/loading-states/Skeletons'
import { cn } from '@/shared/utils/merge-class-names'

export interface LeaderboardSkeletonProps {

count?: number

className?: string
}

export function LeaderboardSkeleton({
count = 10,
className,
}: LeaderboardSkeletonProps) {
return (
<div
role='status'
aria-live='polite'
aria-label='Loading leaderboard'
data-testid='leaderboard-skeleton'
className={cn(
'bg-card border border-border rounded-lg overflow-hidden',
className,
      )}
    >
<div className='space-y-1 p-2'>
{Array.from({ length: count }).map((_, i) => (
<LeaderboardRowSkeleton key={i} />
        ))}
</div>
</div>
  )
}
