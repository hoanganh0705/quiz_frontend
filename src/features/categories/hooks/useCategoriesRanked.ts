'use client'

/**
 * `useCategoriesRanked` — non-paginated top list of popular categories.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B1.
 *
 * Wraps `getCategoriesRanked` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/categories/popular` is non-paginated (limit-bounded
 * up to 100) — the planning doc called it "ranked"; the backend's
 * term is `popular` (Epic 3.3 A1 §2 records the drift).
 *
 * Naming note: the function is `getCategoriesRanked`; the result DTO
 * is `RankedCategoryResponseDto[]`; the hook name is
 * `useCategoriesRanked`. All three terms preserve the planning
 * intent while the underlying SDK call targets `/popular`.
 *
 * The SWR key is `['categories', 'ranked', params]` so a different
 * `limit` produces a separate cache entry.
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoriesRanked } from '@/features/categories/wrappers/category.wrapper'

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
