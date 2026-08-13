'use client'

/**
 * `useLiveWinners()` — read-side hook for the live-winners
 * carousel (Phase 3 / S-15). Reads the
 * `GET /leaderboard/recent-winners` endpoint and returns
 * the typed winners list.
 *
 * The hook is read-only by Phase 3 spec; no poll, no
 * socket. SWR's `revalidateOnFocus` is the global default
 * (`false` on this project), so the carousel only
 * refreshes on route entry / manual `refresh()`.
 *
 * Phase 3 (S-15): the regenerated SDK exposes the
 * `leaderboardControllerGetRecentWinners()` operation
 * under `getLeaderboards()`. The hook uses the contract
 * directly and narrows the wire DTO into the
 * `WinnerSummary` shape the live composition consumes.
 */

import { useCallback, useMemo } from 'react'
import { useSingleWithRetry, getLeaderboards, type SingleFetcher } from '@/lib/api'

interface WinnerSummary {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  quizTitle: string
  amountWon: string
  timeAgo: string
  wonAt: string
}

interface RecentWinnersResponse {
  winners: readonly WinnerSummary[]
  lastUpdated: string
}

interface UseLiveWinnersResult {
  winners: readonly WinnerSummary[]
  lastUpdated: string | null
  isLoading: boolean
  error: unknown
  refresh: () => Promise<void>
  isRetrying: boolean
}

const SWR_KEY = ['leaderboard', 'recent-winners'] as const

export function useLiveWinners(): UseLiveWinnersResult {
  const fetcher = useMemo<SingleFetcher<RecentWinnersResponse | null>>(
    () => async () => {
      try {
        const envelope =
          await getLeaderboards().rankingControllerGetRecentWinners();
        const payload = envelope?.data ?? null;
        return payload as RecentWinnersResponse | null;
      } catch {
        return null;
      }
    },
    [],
  )

  const { data, isLoading, error, retry, isRetrying } = useSingleWithRetry<RecentWinnersResponse | null>({
    key: SWR_KEY,
    fetcher,
  })

  const refresh = useCallback(async (): Promise<void> => {
    await retry()
  }, [retry])

  return {
    winners: data?.winners ?? [],
    lastUpdated: data?.lastUpdated ?? null,
    isLoading,
    error,
    refresh,
    isRetrying,
  }
}