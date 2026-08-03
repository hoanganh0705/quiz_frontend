'use client'

/**
 * `useTagsTrending` — non-paginated top list of trending tags.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B2.
 *
 * Wraps `getTagsTrending` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/tags/trending` is non-paginated (limit-bounded
 * up to 100) per TKT-3.4.A1 §2.
 *
 * The SWR key is `['tags', 'trending', params]` — separate from
 * the popular key so the two strips get independent cache entries.
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

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
