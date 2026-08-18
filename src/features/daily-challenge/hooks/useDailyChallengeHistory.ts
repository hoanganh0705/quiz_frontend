'use client'

import { useCallback, useMemo } from 'react'

import {
ApiError,
useCursorPaginated,
type CursorPage,
} from '@/lib/api'

import {
getDailyChallengeHistoryPage,
type DailyChallengeHistoryItemView,
} from '@/features/daily-challenge/services/daily-challenge.service'

export const DAILY_CHALLENGE_HISTORY_PAGE_LIMIT = 5

export type DailyChallengeHistoryItemWithId =
DailyChallengeHistoryItemView & { id: string }

export interface UseDailyChallengeHistoryResult {
items: readonly DailyChallengeHistoryItemWithId[]
isLoading: boolean
isLoadingMore: boolean
hasMore: boolean
loadMore: () => void
error: ApiError | null
isMissingEndpoint: boolean
refresh: () => Promise<void>
retryBannerVisible: boolean
mutate: () => Promise<void>
}

export function useDailyChallengeHistory(): UseDailyChallengeHistoryResult {

const fetcher = useMemo(
() =>
async ({
cursor,
      }: {
cursor: string | null
params: { limit: number }
signal?: AbortSignal
      }): Promise<CursorPage<DailyChallengeHistoryItemWithId>> => {
const result = await getDailyChallengeHistoryPage({
...(cursor !== null ? { cursor } : {}),
limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT,
        })

if (result.kind === 'missing-endpoint') {
throw new Error('daily-challenge history endpoint unavailable')
        }
if (result.kind === 'error') {
throw result.error
        }

const page = result.data
return {
items: page.items.map((item) => Object.assign({}, item)),
nextCursor: page.nextCursor,
hasNextPage: page.hasNextPage,
limit: page.limit,
        }
      },
[],
  )

const result = useCursorPaginated<
DailyChallengeHistoryItemWithId,
{ limit: number }
  >({
key: ['daily-challenge', 'history', { limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT }],
fetcher,
params: { limit: DAILY_CHALLENGE_HISTORY_PAGE_LIMIT },
paginationKind: 'cursor',
  })

const refresh = useCallback(async (): Promise<void> => {
await result.refresh()
  }, [result])

const isMissingEndpoint = false

return {
items: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
isMissingEndpoint,
refresh,
retryBannerVisible: result.retryBannerVisible ?? false,
mutate: result.refresh,
  }
}
