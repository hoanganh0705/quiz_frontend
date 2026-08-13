'use client'

/**
 * `useMyRanking` — single-resource read hook for the authenticated
 * viewer's rank profile.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `CompetitionStats` + `YourRankingPopup`.
 *
 * Wraps `rankingControllerGetMyRank()` (the auth-only `/leaderboard/me`
 * endpoint) with the `useSingleWithRetry` primitive (Epic 3.6).
 *
 * ## Why a dedicated hook
 *
 * The `/leaderboard` page surface renders three pieces that need the
 * viewer's rank (`LeaderboardHeader`, `CompetitionStats`, and
 * `YourRankingPopup`). Each piece previously hardcoded values
 * (`userRank=42`, `userPoints=3250`, …). To swap the mocks for the
 * real API we need:
 *
 *   - A single SWR key per viewer so all three pieces share the
 *     cache (`useSingleWithRetry` keys).
 *   - A typed `UseMyRankingResult` shape that lets each piece read
 *     the field it needs without re-deriving it from the wire.
 *   - The auth gate at the hook boundary — the endpoint is auth-only
 *     and the hook is the only place we know whether the viewer is
 *     signed in.
 *
 * ## Auth gating
 *
 * The endpoint is auth-only. The hook fires only when the cookie-
 * backed `useAuthState().isAuthenticated` is `true`. When the viewer
 * is anonymous, the hook returns the empty-state shape
 * (`data: null`, `isLoading: false`, `error: null`) so the
 * downstream components can render a graceful "sign in to see your
 * ranking" message instead of a 401.
 *
 * ## Freshness policy
 *
 * `useSingleWithRetry` uses the documented 429 backoff policy
 * (250 / 500 / 1000 ms) and exposes `retry()` for the 5xx retry
 * banner. The hook is the canonical refresh path for the viewer
 * rank after `auth-state-change` events.
 *
 * ## Race handling
 *
 * Each new request takes a monotonic epoch. Resolutions from older
 * epochs are dropped before they reach `data` / `error` — the same
 * contract as `useSingleWithRetry` (Epic 3.6 B1 #2).
 */

import { useMemo } from 'react'

import { ApiError, useSingleWithRetry } from '@/lib/api'

import { useAuthState } from '@/features/auth/hooks/use-auth-state'

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards'
import type {
  UserRankResponseDto,
  PeakRanksResponseDto,
  UserRankPositionDto,
  UserBadgesDto,
} from '@/lib/api/generated/schemas'

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseMyRankingResult {
  /** The wire payload. `null` when unauthenticated or not yet fetched. */
  data: UserRankResponseDto | null
  /** Whether the very first request is in flight. */
  isLoading: boolean
  /** Typed error from the latest attempt (auth/4xx/5xx/429). */
  error: ApiError | null
  /** Whether the viewer is signed in. */
  isAuthenticated: boolean
  /** Manual retry — pass-through to `useSingleWithRetry`. */
  retry: () => Promise<void>
}

/**
 * Convenience selectors. These are pure projections of the wire
 * payload so consumers don't need to know the DTO shape.
 */
export function getWeeklyPosition(
  data: UserRankResponseDto | null,
): UserRankPositionDto | null {
  return data?.global?.weekly ?? null
}

export function getMonthlyPosition(
  data: UserRankResponseDto | null,
): UserRankPositionDto | null {
  return data?.global?.monthly ?? null
}

export function getAllTimePosition(
  data: UserRankResponseDto | null,
): UserRankPositionDto | null {
  return data?.global?.allTime ?? null
}

export function getPeakRanks(
  data: UserRankResponseDto | null,
): PeakRanksResponseDto | null {
  return data?.peakRanks ?? null
}

export function getBadges(
  data: UserRankResponseDto | null,
): UserBadgesDto | null {
  return data?.badges ?? null
}

// ─── Empty shapes ────────────────────────────────────────────────────────

const EMPTY_RESULT: UseMyRankingResult = Object.freeze({
  data: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  retry: () => Promise.resolve(),
}) as UseMyRankingResult

// ─── Hook ────────────────────────────────────────────────────────────────

export function useMyRanking(): UseMyRankingResult {
  const { isAuthenticated } = useAuthState()

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!isAuthenticated) return null
    return ['leaderboard', 'me', 'rank'] as const
  }, [isAuthenticated])

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal
      }): Promise<UserRankResponseDto> => {
        const sdk = getLeaderboards()
        const result = await sdk.rankingControllerGetMyRank()
        // The SDK returns a wrapped envelope `{ data, meta }`. The
        // interceptor does NOT unwrap (Phase-3 drift comment in
        // `custom-instance.ts`), so we read `.data` here.
        const wire = result as unknown as { data?: UserRankResponseDto }
        if (signal.aborted) {
          throw new DOMException('aborted', 'AbortError')
        }
        if (!wire.data) {
          throw new ApiError({
            status: 502,
            code: 'GLOBAL_INVALID_RESPONSE',
            message: 'Empty payload from /leaderboard/me',
          } as unknown as ConstructorParameters<typeof ApiError>[0])
        }
        return wire.data
      },
    [],
  )

  const single = useSingleWithRetry<UserRankResponseDto>({
    key,
    fetcher,
  })

  if (!isAuthenticated) {
    return EMPTY_RESULT
  }

  return {
    data: single.data ?? null,
    isLoading: single.isLoading,
    error: single.error,
    isAuthenticated,
    retry: single.retry,
  }
}
