'use client'

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

export function useDailyChallengeToday(): UseDailyChallengeTodayResult {

const fetcher = useMemo<SingleFetcher<DailyChallengeView | null>>(
() => async () => {
const result = await getDailyChallengeToday()
if (result.kind === 'ok') {
return result.data
      }
if (result.kind === 'missing-endpoint') {

return null
      }

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
