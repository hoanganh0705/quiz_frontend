'use client'

/**
 * `useLeaderboardSummary` — single-resource read hook for the header
 * stats on the `/leaderboard` page.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHeader` totalParticipants.
 *
 * Wraps `rankingControllerGetGlobalLeaderboard({ limit: 1 })` to
 * surface the page chrome (`totalParticipants`, `period`) without
 * pulling the full entries list. The hook is a thin wrapper around
 * `useSingleWithRetry` (Epic 3.6).
 *
 * ## Why not `useLeaderboard(period)`
 *
 * `useLeaderboard(period)` is a cursor-paginated list; it does not
 * expose `totalParticipants` or `period` on the result. The header
 * needs both, so a dedicated single-resource hook is the cleanest
 * fit and lets the header share the same SWR key across renders.
 *
 * ## Wire shape
 *
 * The endpoint returns `{ data: LeaderboardResponseDto, meta }`. The
 * `data` envelope is read at the call boundary (the same convention
 * the `useLeaderboard` hook uses; Phase-3 cross-story contract
 * rule #7).
 */

import { useMemo } from 'react'

import { ApiError, useSingleWithRetry } from '@/lib/api'

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards'
import type {
  LeaderboardResponseDto,
  PeriodInfoDto,
} from '@/lib/api/generated/schemas'
import type { LeaderboardPeriod } from '@/features/leaderboard/services/leaderboard.service'

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseLeaderboardSummaryResult {
  /** Total participants in the selected period. */
  readonly totalParticipants: number | null
  /** Period info (start, end, reset seconds). */
  readonly period: PeriodInfoDto | null
  /** True while the first request is in flight. */
  readonly isLoading: boolean
  /** Typed error from the latest attempt. */
  readonly error: ApiError | null
  /** Manual retry — pass-through to `useSingleWithRetry`. */
  readonly retry: () => Promise<void>
}

/**
 * `useLeaderboardSummary(period)` — read the header stats.
 *
 * @param period The leaderboard period. Defaults to `weekly` (the
 *               canonical Phase 3 default; drift A1 §8 lock).
 */
export function useLeaderboardSummary(
  period: LeaderboardPeriod = 'weekly',
): UseLeaderboardSummaryResult {
  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal
      }): Promise<LeaderboardResponseDto> => {
        const sdk = getLeaderboards()
        const result = await sdk.rankingControllerGetGlobalLeaderboard({
          period,
          limit: 1,
        })
        if (signal.aborted) {
          throw new DOMException('aborted', 'AbortError')
        }
        const wire = result as unknown as {
          data?: LeaderboardResponseDto
        }
        if (!wire.data) {
          throw new ApiError({
            status: 502,
            code: 'GLOBAL_INVALID_RESPONSE',
            message: 'Empty payload from /leaderboard',
          } as unknown as ConstructorParameters<typeof ApiError>[0])
        }
        return wire.data
      },
    [period],
  )

  const single = useSingleWithRetry<LeaderboardResponseDto>({
    key: ['leaderboard', 'summary', period] as const,
    fetcher,
  })

  if (single.data === undefined) {
    return {
      totalParticipants: null,
      period: null,
      isLoading: single.isLoading,
      error: single.error,
      retry: single.retry,
    }
  }

  return {
    totalParticipants: single.data.totalParticipants ?? null,
    period: single.data.period ?? null,
    isLoading: single.isLoading,
    error: single.error,
    retry: single.retry,
  }
}
