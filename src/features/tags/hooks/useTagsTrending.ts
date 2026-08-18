'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedTagResponseDto } from '@/lib/api/generated/schemas'

import { getTagsTrending } from '@/features/tags/services/tags.service'

export interface UseTagsTrendingParams {
limit?: number
}

export interface UseTagsTrendingResult {
tags: readonly RankedTagResponseDto[]
isLoading: boolean
error: ApiError | null
}

export function useTagsTrending(
params: UseTagsTrendingParams = {},
): UseTagsTrendingResult {
const key = ['tags', 'trending', params] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getTagsTrending({ limit: params.limit })
return result.data ?? []
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

return {
tags: data ?? [],
isLoading,
error: error instanceof ApiError ? error : null,
  }
}
