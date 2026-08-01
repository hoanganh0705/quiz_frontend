'use client'

/**
 * `useCategoriesTrending` — non-paginated top list of trending categories.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B2.
 *
 * Wraps `getCategoriesTrending` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/categories/trending` is non-paginated (limit-bounded
 * up to 100).
 *
 * The SWR key is `['categories', 'trending', params]` — separate from
 * the ranked key so the two strips get independent cache entries.
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoriesTrending } from '@/features/categories/wrappers/category.wrapper'

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
