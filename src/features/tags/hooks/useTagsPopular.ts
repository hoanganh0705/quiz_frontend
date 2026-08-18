'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedTagResponseDto } from '@/lib/api/generated/schemas'

import { getTagsPopular } from '@/features/tags/services/tags.service'

export interface UseTagsPopularParams {
limit?: number
}

export interface UseTagsPopularResult {
tags: readonly RankedTagResponseDto[]
isLoading: boolean
error: ApiError | null
}

export function useTagsPopular(
params: UseTagsPopularParams = {},
): UseTagsPopularResult {
const key = ['tags', 'popular', params] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getTagsPopular({ limit: params.limit })
return result.data ?? []
    },
{
      // Inherit the global SwrProvider defaults (`revalidateOnFocus: false`,
      // `dedupingInterval: 2_000`, `errorRetryCount: 3`). No per-call overrides.
    },
  )

return {
tags: data ?? [],
isLoading,
error: error instanceof ApiError ? error : null,
  }
}
