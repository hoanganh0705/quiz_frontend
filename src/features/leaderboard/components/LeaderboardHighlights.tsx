'use client'

import { useCallback, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { CardContent } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/Card'
import { CardTitle } from '@/components/ui/Card'
import { CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Trophy } from 'lucide-react'

import {
useLeaderboard,
useTopMovers,
} from '@/features/leaderboard/hooks'
import type { LeaderboardPeriod } from '@/features/leaderboard/services/leaderboard.service'
import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'
import type { TopMoverDto } from '@/lib/api/generated/schemas'

import GlobalTab from './GlobalTab'
import CategoryTab from './CategoryTab'
import TrendingTab from './TrendingTab'

const TIME_PERIODS: ReadonlyArray<{
value: LeaderboardPeriod
label: string

disabled: boolean
}> = [
{ value: 'all_time', label: 'All Time', disabled: false },
{ value: 'monthly', label: 'Monthly', disabled: false },
{ value: 'weekly', label: 'Weekly', disabled: false },
]

function toTopMoversPeriod(
period: LeaderboardPeriod,
): 'weekly' | 'monthly' {
if (period === 'all_time') return 'monthly'
return period
}

type ActiveTab = 'global' | 'category' | 'trending'

export function LeaderboardHighlights() {
const [activeTab, setActiveTab] = useState<ActiveTab>('global')
const [timePeriod, setTimePeriod] = useState<LeaderboardPeriod>('weekly')
const [selectedCategory, setSelectedCategory] = useState<string>('all')

const {
entries: topEntries,
isLoading: isLeaderboardLoading,
  } = useLeaderboard(timePeriod)

const topFive: readonly LeaderboardEntryDto[] = useMemo(
() => topEntries.slice(0, 5),
[topEntries],
  )

const {
movers,
isLoading: isMoversLoading,
  } = useTopMovers(toTopMoversPeriod(timePeriod))

const topMovers: readonly TopMoverDto[] = useMemo(
() => movers.slice(0, 10),
[movers],
  )

const isLoading = isLeaderboardLoading || isMoversLoading

const handleTabChange = useCallback((value: string) => {
setActiveTab(value as ActiveTab)
  }, [])

const handleTimePeriodChange = useCallback(
(value: LeaderboardPeriod) => {
setTimePeriod(value)
    },
[],
  )

const handleCategoryChange = useCallback((value: string) => {

setSelectedCategory(value)
  }, [])

return (
<Card className=' bg-background border border-border col-span-2 lg:col-span-2 py-4 sm:py-6'>
<CardHeader>
<div className='flex items-center justify-between'>
<div>
<CardTitle className='text-foreground text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2'>
<Trophy
className='w-5 h-5 sm:w-6 sm:h-6 text-yellow-400'
aria-hidden='true'
              />
Leaderboard Highlights
            </CardTitle>
<CardDescription className='text-foreground/80 text-sm sm:text-base'>
Top performers across different categories and time periods
            </CardDescription>
</div>
</div>
</CardHeader>

<CardContent className='space-y-4 sm:space-y-6'>
{/* Tab strip */}
<div
className='grid grid-cols-3 bg-muted rounded-md p-1 w-full max-w-md'
role='tablist'
aria-label='Leaderboard views'
        >
{(
[
{ value: 'global', label: 'Global' },
{ value: 'category', label: 'By Category' },
{ value: 'trending', label: 'Trending' },
            ] as ReadonlyArray<{ value: ActiveTab; label: string }>
          ).map(({ value, label }) => (
<Button
key={value}
role='tab'
aria-selected={activeTab === value}
onClick={() => handleTabChange(value)}
variant={activeTab === value ? 'default' : 'ghost'}
size='sm'
className='text-xs sm:text-sm'
            >
{label}
</Button>
          ))}
</div>

{/* Time-period filters */}
<div
className='flex flex-wrap gap-2'
role='toolbar'
aria-label='Time period filters'
        >
{TIME_PERIODS.map(({ value, label, disabled }) => (
<Button
key={value}
variant={timePeriod === value ? 'default' : 'outline'}
size='sm'
disabled={disabled}
onClick={() => handleTimePeriodChange(value)}
className={`text-xs sm:text-sm ${
timePeriod === value
? 'bg-brand hover:bg-brand'
: 'border-border text-foreground/80 hover:bg-accent'
}`}
            >
{label}
</Button>
          ))}
</div>

{/* Category placeholder (the API does not slice per category) */}
{activeTab === 'category' && (
<div
className='flex flex-col gap-1'
aria-label='Category filter (placeholder)'
          >
<select
value={selectedCategory}
onChange={(e) => handleCategoryChange(e.target.value)}
aria-label='Category'
className='w-full bg-main border border-border text-foreground text-xs sm:text-sm rounded-md p-2'
            >
<option value='all'>All Categories</option>
<option value='coding'>Coding</option>
<option value='design'>Design</option>
<option value='marketing'>Marketing</option>
<option value='science'>Science</option>
<option value='history'>History</option>
</select>
<p className='text-xs text-foreground/60'>
The leaderboard API does not slice per category yet. The
              top-3 below are the global podium — a per-category
              filter is on the roadmap.
            </p>
</div>
        )}

{/* Tab content */}
{activeTab === 'global' && (
<GlobalTab users={topFive} isLoading={isLoading} />
        )}
{activeTab === 'category' && (
<CategoryTab
users={topFive}
isLoading={isLoading}
category={selectedCategory}
          />
        )}
{activeTab === 'trending' && (
<TrendingTab users={topMovers} isLoading={isLoading} />
        )}
</CardContent>
</Card>
  )
}
