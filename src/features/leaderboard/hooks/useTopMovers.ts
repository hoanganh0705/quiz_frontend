'use client'

import { useMemo } from 'react'

import { ApiError, useSingleWithRetry } from '@/lib/api'

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards'
import type { TopMoverDto } from '@/lib/api/generated/schemas'
import type { RankingControllerGetTopMoversPeriod } from '@/lib/api/generated/schemas/rankingControllerGetTopMoversPeriod'

export type TopMoversPeriod = RankingControllerGetTopMoversPeriod

const DEFAULT_PERIOD: TopMoversPeriod = 'weekly'

export interface UseTopMoversResult {
readonly movers: readonly TopMoverDto[]
readonly isLoading: boolean
readonly error: ApiError | null
readonly retry: () => Promise<void>
}

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
