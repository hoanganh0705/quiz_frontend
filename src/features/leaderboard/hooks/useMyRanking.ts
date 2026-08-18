'use client'

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

export interface UseMyRankingResult {

data: UserRankResponseDto | null

isLoading: boolean

error: ApiError | null

isAuthenticated: boolean

retry: () => Promise<void>
}

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

const EMPTY_RESULT: UseMyRankingResult = Object.freeze({
data: null,
isLoading: false,
error: null,
isAuthenticated: false,
retry: () => Promise.resolve(),
}) as UseMyRankingResult

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
