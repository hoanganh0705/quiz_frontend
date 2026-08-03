'use client'

/**
 * `useTagsPopular` — non-paginated top list of popular tags.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B1.
 *
 * Wraps `getTagsPopular` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/tags/popular` is non-paginated (limit-bounded
 * up to 100) per TKT-3.4.A1 §2.
 *
 * The SWR key is `['tags', 'popular', params]` so a different
 * `limit` produces a separate cache entry. The hook never uses
 * `useCursorPaginated` (the endpoint is non-paginated; using the
 * cursor primitive would be a contract violation).
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

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
