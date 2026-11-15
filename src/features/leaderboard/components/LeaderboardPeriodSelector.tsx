'use client'

import { useId } from 'react'

import { cn } from '@/shared/utils/merge-class-names'

import type { LeaderboardPeriod } from '@/features/leaderboard/services/leaderboard.service'

export interface LeaderboardPeriodSelectorProps {

period: LeaderboardPeriod

onChange: (period: LeaderboardPeriod) => void

className?: string
}

interface PeriodOption {
value: LeaderboardPeriod
label: string
}

const PERIOD_OPTIONS: readonly PeriodOption[] = [
{ value: 'weekly', label: 'Weekly' },
{ value: 'monthly', label: 'Monthly' },
{ value: 'all_time', label: 'All-time' },
]

export function LeaderboardPeriodSelector({
period,
onChange,
className,
}: LeaderboardPeriodSelectorProps) {

const groupLabelId = useId()

return (
<div
role='group'
aria-labelledby={groupLabelId}
className={cn(
'inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/60 backdrop-blur-xs',
className,
      )}
    >
<span id={groupLabelId} className='sr-only'>
Leaderboard period
      </span>
{PERIOD_OPTIONS.map((option) => {
const isSelected = option.value === period
return (
<button
key={option.value}
type='button'
aria-pressed={isSelected}
onClick={() => {
if (!isSelected) {
onChange(option.value)
              }
            }}
className={cn(
'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
isSelected
? 'bg-background text-foreground shadow-xs font-semibold'
: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
{option.label}
</button>
        )
      })}
</div>
  )
}
