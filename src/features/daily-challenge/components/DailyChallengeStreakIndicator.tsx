

import { Flame } from 'lucide-react'

import { cn } from '@/shared/utils/merge-class-names'

export interface DailyChallengeStreakIndicatorProps {
streak: number
className?: string
}

export function DailyChallengeStreakIndicator({
streak,
className,
}: DailyChallengeStreakIndicatorProps) {
return (
<span
data-testid='daily-challenge-streak-indicator'
aria-label={`Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
className={cn(
'inline-flex items-center gap-1 text-sm font-medium text-foreground/90',
className,
      )}
    >
<Flame className='h-4 w-4 text-orange-400' aria-hidden='true' />
<span aria-hidden='true'>
{streak} {streak === 1 ? 'day' : 'days'} streak
      </span>
</span>
  )
}
