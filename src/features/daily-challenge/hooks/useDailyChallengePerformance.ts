'use client'

import { useMemo } from 'react'

import type { DailyChallengeHistoryItemWithId } from './useDailyChallengeHistory'
import { useDailyChallengeHistory } from './useDailyChallengeHistory'

/**
 * `useDailyChallengePerformance` — derives per-day-of-week aggregate
 * performance metrics from the viewer's daily-challenge history.
 *
 * Source epic:   Phase 1 (F-2 in the remaining-gaps plan) — `<ChallengeChart />`
 *                must consume real history instead of the hardcoded
 *                `performanceData` constant.
 * Source ticket: F-2.
 *
 * ## Output shape
 *
 * ```ts
 * Array<{
 *   day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
 *   yourScore: number      // mean score for the most recent attempt per day-of-week
 *   avgScore: number       // mean score across all attempts on that day-of-week
 *   hasAttempt: boolean     // false when the viewer has never played on this day
 *   attemptCount: number
 * }>
 * ```
 *
 * The array always contains exactly 7 entries (one per weekday), in
 * Mon→Sun order. Weekdays without any history entries are returned with
 * `yourScore: 0`, `avgScore: 0`, `hasAttempt: false`. This matches the
 * shape the bar chart needs and keeps the X-axis stable.
 *
 * ## Loading / error semantics
 *
 * The hook delegates loading + error to `useDailyChallengeHistory`. The
 * chart component is responsible for rendering skeletons / retry
 * surfaces on top of this hook's output.
 *
 * ## Why a separate hook
 *
 * The history list hook returns raw items; this hook adds a derived
 * view (day-of-week rollup). Keeping the derivation in its own hook:
 *   - lets `<ChallengeChart />` stay declarative (pure props-in / JSX-out),
 *   - makes the rollup logic independently unit-testable,
 *   - avoids the chart silently re-deriving on every parent render
 *     because the parent only sees memoised output.
 */
export type DailyChallengePerformanceDayKey =
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
  | 'Sun'

export interface DailyChallengePerformanceDay {
  day: DailyChallengePerformanceDayKey
  yourScore: number
  avgScore: number
  hasAttempt: boolean
  attemptCount: number
}

export interface UseDailyChallengePerformanceResult {
  days: readonly DailyChallengePerformanceDay[]
  totalAttempts: number
  isLoading: boolean
  error: import('@/lib/api').ApiError | null
  /**
   * Re-fetches the underlying history. Exposed so the chart's error
   * state can offer a retry affordance without the chart needing to
   * reach into the history hook directly.
   */
  refresh: () => Promise<void>
}

const DAY_ORDER: readonly DailyChallengePerformanceDayKey[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

// JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat. We re-map to a
// Mon-first ordering so the chart's X-axis is left-to-right Mon→Sun.
function jsDayToKey(jsDay: number): DailyChallengePerformanceDayKey {
  switch (jsDay) {
    case 1:
      return 'Mon'
    case 2:
      return 'Tue'
    case 3:
      return 'Wed'
    case 4:
      return 'Thu'
    case 5:
      return 'Fri'
    case 6:
      return 'Sat'
    case 0:
    default:
      return 'Sun'
  }
}

/**
 * Roll up a list of history items into per-day-of-week performance.
 *
 * Exported so the unit test can exercise it without rendering React.
 * Pure function — no side effects, no `Date.now()` calls — so it is
 * safe to call from render and from tests.
 */
export function rollupHistoryByWeekday(
  items: readonly DailyChallengeHistoryItemWithId[],
): readonly DailyChallengePerformanceDay[] {
  type Bucket = {
    yourScore: number
    avgScoreSum: number
    attemptCount: number
  }

  const buckets = new Map<DailyChallengePerformanceDayKey, Bucket>()
  for (const key of DAY_ORDER) {
    buckets.set(key, { yourScore: 0, avgScoreSum: 0, attemptCount: 0 })
  }

  for (const item of items) {
    // The DTO's `date` is an ISO timestamp; `new Date(...)` parses it
    // without timezone surprises because we only read `getDay()`.
    const parsed = new Date(item.date)
    if (Number.isNaN(parsed.getTime())) {
      // Defensive: skip unparseable dates rather than throwing in render.
      continue
    }
    const key = jsDayToKey(parsed.getDay())
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.yourScore = item.score // last write wins — the loop iterates
    // items newest-first (history order), so the latest attempt on
    // that weekday wins.
    bucket.avgScoreSum += item.score
    bucket.attemptCount += 1
  }

  return DAY_ORDER.map((day) => {
    const bucket = buckets.get(day)!
    const hasAttempt = bucket.attemptCount > 0
    return {
      day,
      yourScore: hasAttempt ? Math.round(bucket.yourScore) : 0,
      avgScore: hasAttempt
        ? Math.round(bucket.avgScoreSum / bucket.attemptCount)
        : 0,
      hasAttempt,
      attemptCount: bucket.attemptCount,
    }
  })
}

export function useDailyChallengePerformance(): UseDailyChallengePerformanceResult {
  const { items, isLoading, error, refresh } = useDailyChallengeHistory()

  const days = useMemo(() => rollupHistoryByWeekday(items), [items])

  const totalAttempts = useMemo(
    () => days.reduce((sum, d) => sum + d.attemptCount, 0),
    [days],
  )

  return {
    days,
    totalAttempts,
    isLoading,
    error,
    refresh,
  }
}
