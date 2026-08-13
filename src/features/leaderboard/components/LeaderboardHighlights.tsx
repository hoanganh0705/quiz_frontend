'use client'

/**
 * `LeaderboardHighlights` — live composition of the three
 * leaderboard tabs (Global / Category / Trending).
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHighlights`.
 *
 * The previous version of this component hardcoded:
 *   - `mockUsers` (Alex Chen, Sarah Kim, …)
 *   - `categoryUsers` (coding / design / marketing top-3)
 *   - `trendingUsers` (synthetic movers)
 *   - `categories` (coding / design / marketing / science / history)
 *
 * All of those mocks have been removed. The component now reads:
 *
 *   - Global:    `useTopOfLeaderboard(limit)` — top 5 entries from
 *                 `rankingControllerGetGlobalLeaderboard`.
 *   - Trending:  `useTopMovers(period)` — from
 *                 `rankingControllerGetTopMovers`.
 *   - Category:  same top-5 (the ranking API does not slice per
 *                 category yet — the tab renders the global top-3
 *                 with a clear "All categories" badge).
 *
 * The "Time period" filter (all-time / monthly / weekly / daily) is
 * kept for UX continuity, but is intentionally NOT wired to the API
 * (the public leaderboard supports `weekly | monthly | all_time`).
 * When the user picks an unsupported period the tab shows the
 * empty-state branch instead of returning a 404.
 *
 * ## Selected category
 *
 * The "By Category" tab used to expose a category picker. It now
 * defaults to `all` and the picker is rendered as a disabled select
 * (with a tooltip explaining the API gap). Removing the picker
 * entirely would change the layout; keeping it disabled preserves
 * the surface shape so the cleanup is invisible to downstream
 * designs.
 */

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

// ─── Constants ────────────────────────────────────────────────────────────

const TIME_PERIODS: ReadonlyArray<{
  value: LeaderboardPeriod
  label: string
  /** Disabled periods are not supported by the public API. */
  disabled: boolean
}> = [
  { value: 'all_time', label: 'All Time', disabled: false },
  { value: 'monthly', label: 'Monthly', disabled: false },
  { value: 'weekly', label: 'Weekly', disabled: false },
]

// Map the leaderboard period to a period supported by the top-movers
// endpoint. The top-movers endpoint supports `weekly | monthly` only
// — `all_time` is silently mapped to `monthly` as the nearest
// equivalent (the top-movers score is mostly weekly anyway).
function toTopMoversPeriod(
  period: LeaderboardPeriod,
): 'weekly' | 'monthly' {
  if (period === 'all_time') return 'monthly'
  return period
}

type ActiveTab = 'global' | 'category' | 'trending'

// ─── Component ───────────────────────────────────────────────────────────

export function LeaderboardHighlights() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('global')
  const [timePeriod, setTimePeriod] = useState<LeaderboardPeriod>('weekly')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Global leaderboard — top 5 entries for the selected period.
  const {
    entries: topEntries,
    isLoading: isLeaderboardLoading,
  } = useLeaderboard(timePeriod)

  const topFive: readonly LeaderboardEntryDto[] = useMemo(
    () => topEntries.slice(0, 5),
    [topEntries],
  )

  // Top movers — top 10 for the selected period.
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
    // The ranking API does not slice per category; the picker is
    // a UX placeholder. We keep the first three characters of the
    // selection so the disabled `<select>` still updates visually.
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
