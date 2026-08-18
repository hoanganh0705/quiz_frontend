'use client'

import { useMemo } from 'react'

import { ApiError, projectWithId, useCursorPaginated } from '@/lib/api'
import type { OffsetPage } from '@/lib/api/use-cursor-paginated.types'
import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'

import {
getLeaderboardWithPagination,
type LeaderboardPeriod,
} from '@/features/leaderboard/services/leaderboard.service'

export const LEADERBOARD_PAGE_LIMIT = 20

export type LeaderboardEntryWithId = LeaderboardEntryDto & { id: string }

export interface UseLeaderboardResult {
entries: readonly LeaderboardEntryWithId[]
isLoading: boolean
isLoadingMore: boolean
hasMore: boolean
loadMore: () => void
error: ApiError | null
refresh: () => Promise<void>
retryBannerVisible: boolean
}

export function useLeaderboard(
period: LeaderboardPeriod,
): UseLeaderboardResult {

const fetcher = useMemo(
() =>
async ({
page,
params,
      }: {
page: number
params: { period: LeaderboardPeriod; limit: number }
signal?: AbortSignal
      }): Promise<OffsetPage<LeaderboardEntryWithId>> => {

const offset = (page - 1) * params.limit
const result = await getLeaderboardWithPagination(params.period, {
limit: params.limit,
offset,
        })

const data = (result as { data?: { entries?: LeaderboardEntryDto[] } }).data
const entries = (data?.entries ?? []) as Array<LeaderboardEntryWithId>

const itemsWithId = projectWithId(entries as unknown as readonly Record<string, unknown>[], 'userId') as unknown as Array<LeaderboardEntryWithId>

const pagination = (result as {
data?: { pagination?: { hasMore?: boolean; limit?: number } }
        }).data?.pagination
return {
items: itemsWithId,
page,
total: itemsWithId.length,
hasMore: pagination?.hasMore ?? false,
limit: pagination?.limit ?? itemsWithId.length,
        }
      },
[],
  )

const result = useCursorPaginated<LeaderboardEntryWithId, { period: LeaderboardPeriod; limit: number }>({
key: ['leaderboard', period, { limit: LEADERBOARD_PAGE_LIMIT }],
fetcher,
params: { period, limit: LEADERBOARD_PAGE_LIMIT },
paginationKind: 'offset',
  })

return {
entries: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
refresh: result.refresh,
retryBannerVisible: result.retryBannerVisible ?? false,
  }
}
