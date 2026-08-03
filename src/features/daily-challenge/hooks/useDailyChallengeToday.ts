'use client'

/**
 * `useDailyChallengeToday()` — read the day's featured daily-challenge quiz.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B1.
 *
 * ## Fetcher contract
 *
 * The hook wraps `getDailyChallengeToday` (the A3 wrapper) in
 * `useSingleWithRetry` (Epic 3.6 / TKT-3.6.B1) so the 429 backoff policy
 * (250 / 500 / 1000 ms — Story 3.2 D5) is inherited. The hook reads
 * the wrapper's discriminated result at the fetcher boundary; the
 * fetcher resolves with `null` when the wrapper reports
 * `kind: 'missing-endpoint'` (the A1-locked default at this commit —
 * `EPIC_3_12_A1.md` §1.1) and re-throws the `ApiError` from the
 * `kind: 'error'` branch.
 *
 * The hook never resolves a 404 to the user: the wrapper already
 * short-circuits to `kind: 'missing-endpoint'` before any HTTP call
 * (per Story 3.12 AC #2 — "Either way, the page does not 404 on the
 * user").
 *
 * ## Result shape
 *
 *   - `challenge: DailyChallengeView | null` — the day's challenge, or
 *     `null` when the wrapper reports `kind: 'missing-endpoint'`, when
 *     the wrapper reports `kind: 'error'`, or before the first
 *     successful resolution.
 *   - `isLoading: boolean` — true during the initial fetch (inherited
 *     from `useSingleWithRetry`).
 *   - `error: ApiError | null` — the typed RFC 7807 error, or `null`
 *     when the wrapper reports `kind: 'ok'` or `kind: 'missing-endpoint'`.
 *   - `isMissingEndpoint: boolean` — true when the wrapper reports
 *     `kind: 'missing-endpoint'`. The live composition (TKT-3.12.C1)
 *     reads this flag to render `<DailyChallengePlaceholder />`.
 *   - `isNotFound: boolean` — always `false` for this hook. The
 *     wrapper never produces a 404 surface; the placeholder is the
 *     only "not found" branch.
 *   - `refresh: () => Promise<void>` — manual revalidation; surfaced
 *     so a future story (Phase 5) can wire it to the auth state.
 *   - `isRetrying: boolean` — true while the 429 backoff is in flight.
 *
 * ## Read-only contract
 *
 * The hook is read-only by spec (Story 3.12 line 1234 — "read-only and
 * intentionally small"). It does NOT poll, auto-refresh, or open a
 * WebSocket. SWR's `revalidateOnFocus` is the global default
 * (`false` — Phase 3 lists refresh on route entry, not on focus).
 *
 * ## Cache identity
 *
 * The SWR key is `['daily-challenge', 'today']`. A change to the key
 * invalidates the previous result and triggers a new fetch. The hook
 * has no params; the key is constant for the hook's lifetime.
 */

import { useCallback, useMemo } from 'react'

import {
  ApiError,
  useSingleWithRetry,
  type SingleFetcher,
} from '@/lib/api'

import {
  getDailyChallengeToday,
  type DailyChallengeView,
} from '@/features/daily-challenge/services/daily-challenge.service'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseDailyChallengeTodayResult {
  challenge: DailyChallengeView | null
  isLoading: boolean
  error: ApiError | null
  isMissingEndpoint: boolean
  isNotFound: boolean
  refresh: () => Promise<void>
  isRetrying: boolean
}

const SWR_KEY = ['daily-challenge', 'today'] as const

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyChallengeToday(): UseDailyChallengeTodayResult {
  // The fetcher is a useMemo so the hook's identity is stable across
  // renders (mirrors `useLeaderboard` and `useQuizByIdOrSlug`).
  const fetcher = useMemo<SingleFetcher<DailyChallengeView | null>>(
    () => async () => {
      const result = await getDailyChallengeToday()
      if (result.kind === 'ok') {
        return result.data
      }
      if (result.kind === 'missing-endpoint') {
        // The hook resolves with `null` so the composition can read
        // `isMissingEndpoint` from the result without inspecting the
        // wrapper's discriminator. The fetcher never throws for this
        // case; it is a successful no-data read.
        return null
      }
      // `kind: 'error'` — re-throw the typed `ApiError` so
      // `useSingleWithRetry`'s retry policy applies.
      throw result.error
    },
    [],
  )

  const { data, isLoading, error, retry, isRetrying } = useSingleWithRetry<
    DailyChallengeView | null
  >({
    key: SWR_KEY,
    fetcher,
  })

  const isMissingEndpoint = data === null && !isLoading && error === null

  const refresh = useCallback(async (): Promise<void> => {
    await retry()
  }, [retry])

  return {
    challenge: data ?? null,
    isLoading,
    error,
    isMissingEndpoint,
    isNotFound: false,
    refresh,
    isRetrying,
  }
}
