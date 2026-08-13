'use client'

/**
 * `useTopMovers` — read hook for the leaderboard "trending" surface.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHighlights` → Trending tab.
 *
 * Wraps `rankingControllerGetTopMovers()` (the public
 * `/leaderboard/top-movers` endpoint) with the `useSingleWithRetry`
 * primitive (Epic 3.6). The endpoint is public — no auth required —
 * so the hook fires unconditionally.
 *
 * ## Wire shape
 *
 * The endpoint returns `{ data: TopMoverDto[], meta }`. The wire
 * result is the wrapped envelope; the interceptor does NOT unwrap
 * (Phase-3 drift comment in `custom-instance.ts`), so the fetcher
 * reads `.data` at the call boundary (the same convention the
 * `useLeaderboard` hook uses; see the Phase-3 cross-story contract
 * rule #7).
 *
 * ## Period
 *
 * The endpoint supports `period` ∈ `weekly | monthly | all_time`.
 * The hook defaults to `weekly` (the canonical Phase 3 default;
 * drift A1 §8 lock).
 *
 * ## Empty state
 *
 * An empty array from the server is represented as `movers: []`,
 * not as an error. The consumer renders the empty branch.
 */

import { useMemo } from 'react'

import { ApiError, useSingleWithRetry } from '@/lib/api'

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards'
import type { TopMoverDto } from '@/lib/api/generated/schemas'
import type { RankingControllerGetTopMoversPeriod } from '@/lib/api/generated/schemas/rankingControllerGetTopMoversPeriod'

// The `top-movers` endpoint accepts `weekly | monthly` only. The
// mapper in `LeaderboardHighlights` collapses `all_time` to
// `monthly` before calling this hook, so this default is the
// canonical Phase 3 default (drift A1 §8 lock).
export type TopMoversPeriod = RankingControllerGetTopMoversPeriod

const DEFAULT_PERIOD: TopMoversPeriod = 'weekly'

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseTopMoversResult {
  readonly movers: readonly TopMoverDto[]
  readonly isLoading: boolean
  readonly error: ApiError | null
  readonly retry: () => Promise<void>
}

/**
 * `useTopMovers` — public read.
 *
 * @param period Defaults to `weekly`. Pass an explicit period for
 *               period-aware screens.
 */
export function useTopMovers(
  period: TopMoversPeriod = DEFAULT_PERIOD,
): UseTopMoversResult {
  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal
      }): Promise<readonly TopMoverDto[]> => {
        const sdk = getLeaderboards()
        const result = await sdk.rankingControllerGetTopMovers({ period })
        if (signal.aborted) {
          throw new DOMException('aborted', 'AbortError')
        }
        const wire = result as unknown as { data?: TopMoverDto[] }
        const data = wire.data ?? []
        if (!Array.isArray(data)) {
          throw new ApiError({
            status: 502,
            code: 'GLOBAL_INVALID_RESPONSE',
            message: 'Invalid payload from /leaderboard/top-movers',
          } as unknown as ConstructorParameters<typeof ApiError>[0])
        }
        return data
      },
    [period],
  )

  const single = useSingleWithRetry<readonly TopMoverDto[]>({
    key: ['leaderboard', 'top-movers', period] as const,
    fetcher,
  })

  return {
    movers: single.data ?? [],
    isLoading: single.isLoading,
    error: single.error,
    retry: single.retry,
  }
}
