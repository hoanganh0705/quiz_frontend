'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoriesTrending } from '@/features/categories/services/categories.service'

export interface UseCategoriesTrendingParams {
limit?: number
}

export interface UseCategoriesTrendingResult {
categories: readonly RankedCategoryResponseDto[]
isLoading: boolean
error: ApiError | null
}

export function useCategoriesTrending(
params: UseCategoriesTrendingParams = {},
): UseCategoriesTrendingResult {
const key = ['categories', 'trending', params] as const

const { data, error, isLoading } = useSWR(
key,
async () => {
const result = await getCategoriesTrending({ limit: params.limit })
return result.data ?? []
    },
{
      // Inherit the global SwrProvider defaults.
    },
  )

return {
categories: data ?? [],
isLoading,
error: error instanceof ApiError ? error : null,
  }
}
