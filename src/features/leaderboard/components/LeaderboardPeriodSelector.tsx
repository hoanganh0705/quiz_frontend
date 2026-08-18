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
'inline-flex items-center gap-1 rounded-lg bg-slate-800/40 p-1',
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
'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
isSelected
? 'bg-primary text-white shadow-sm'
: 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
            )}
          >
{option.label}
</button>
        )
      })}
</div>
  )
}
