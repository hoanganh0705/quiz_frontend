'use client'

import { useCallback } from 'react'
import useSWR from 'swr'

import { ApiError } from '@/lib/api'

import {
  getDailyChallengeCategoryBreakdown,
  type DailyChallengeCategoryBreakdownItemView,
} from '@/features/daily-challenge/services/daily-challenge.service'

/**
 * `useDailyChallengeCategoryBreakdown` — surfaces the viewer's
 * per-category rollup of completed daily-challenge attempts.
 *
 * Source epic:   Phase 4 (F-2 in the remaining-gaps plan) — replace
 *                the hardcoded `data` array in `<ChallengePieChart />`
 *                with a real, server-computed distribution.
 * Source ticket: F-2.
 *
 * ## Output shape
 *
 * The hook exposes a `readonly` array of
 * `DailyChallengeCategoryBreakdownItemView`:
 *
 * ```ts
 * Array<{
 *   categoryId: string
 *   categoryName: string
 *   categorySlug: string
 *   attemptCount: number
 *   averageScorePercent: number  // 0–100, 2dp
 * }>
 * ```
 *
 * The array is sorted by `attemptCount DESC, averageScorePercent
 * DESC` server-side — i.e. the largest contributor is first. Empty
 * arrays are returned when the viewer has no completed attempts in
 * any category (which `<ChallengePieChart />` renders as an explicit
 * "Take today's challenge to start your breakdown" state).
 *
 * ## Loading / error semantics
 *
 * Mirrors the pattern in `useDailyChallengeHistory`: SWR keys the
 * payload under `['daily-challenge', 'history', 'categories']` and
 * surfaces a typed `ApiError | null`. The chart renders a skeleton
 * while `isLoading`, an explicit retry surface when `error` is
 * non-null, and the chart itself when `items.length > 0`.
 */
export type DailyChallengeCategoryBreakdownItemWithMeta =
  DailyChallengeCategoryBreakdownItemView & { id: string }

export interface UseDailyChallengeCategoryBreakdownResult {
  items: readonly DailyChallengeCategoryBreakdownItemWithMeta[]
  isLoading: boolean
  error: ApiError | null
  /**
   * Re-fetch the underlying breakdown. Exposed so the chart's error
   * state can offer a retry affordance without the chart reaching
   * into the SWR key directly.
   */
  refresh: () => Promise<void>
}

const SWR_KEY = [
  'daily-challenge',
  'history',
  'categories',
] as const

export function useDailyChallengeCategoryBreakdown(): UseDailyChallengeCategoryBreakdownResult {
  const { data, error, isLoading, mutate } = useSWR(
    SWR_KEY,
    async (): Promise<readonly DailyChallengeCategoryBreakdownItemWithMeta[]> => {
      const result = await getDailyChallengeCategoryBreakdown()
      if (result.kind === 'missing-endpoint') {
        // Treat the endpoint as not-yet-shipped the same way the
        // history hook does — throw so SWR marks the response as
        // an error and the chart renders an honest retry surface.
        throw new Error('daily-challenge history/categories endpoint unavailable')
      }
      if (result.kind === 'error') {
        throw result.error
      }
      return result.data.items.map((item) => ({
        ...item,
        id: item.categoryId,
      }))
    },
    {
      // Inherit global SwrProvider defaults:
      //   - revalidateOnFocus: false
      //   - dedupingInterval: 2_000ms
      //   - errorRetryCount: 3
    },
  )

  const refresh = useCallback(async (): Promise<void> => {
    await mutate()
  }, [mutate])

  return {
    items: data ?? EMPTY_ITEMS,
    isLoading,
    error: error instanceof ApiError ? error : null,
    refresh,
  }
}

const EMPTY_ITEMS: readonly DailyChallengeCategoryBreakdownItemWithMeta[] = Object.freeze([])
