'use client'

import { useMemo } from 'react'

import { ApiError, useSingleWithRetry } from '@/lib/api'

import { getLeaderboards } from '@/lib/api/generated/leaderboards/leaderboards'
import type {
LeaderboardResponseDto,
PeriodInfoDto,
} from '@/lib/api/generated/schemas'
import type { LeaderboardPeriod } from '@/features/leaderboard/services/leaderboard.service'

export interface UseLeaderboardSummaryResult {

readonly totalParticipants: number | null

readonly period: PeriodInfoDto | null

readonly isLoading: boolean

readonly error: ApiError | null

readonly retry: () => Promise<void>
}

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
