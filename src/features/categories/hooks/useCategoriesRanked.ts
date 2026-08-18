'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoriesRanked } from '@/features/categories/services/categories.service'

export interface UseCategoriesRankedParams {
limit?: number
}

export interface UseCategoriesRankedResult {
categories: readonly RankedCategoryResponseDto[]
isLoading: boolean
error: ApiError | null
}

export function useCategoriesRanked(
params: UseCategoriesRankedParams = {},
): UseCategoriesRankedResult {
const key = ['categories', 'ranked', params] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getCategoriesRanked({ limit: params.limit })
return result.data ?? []
    },
{
      // Inherit the global SwrProvider defaults (`revalidateOnFocus: false`,
      // `dedupingInterval: 2_000`, `errorRetryCount: 3`). No per-call overrides.
    },
  )

return {
categories: data ?? [],
isLoading,
error: error instanceof ApiError ? error : null,
  }
}
