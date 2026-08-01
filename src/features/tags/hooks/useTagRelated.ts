'use client'

/**
 * `useTagRelated` — non-paginated list of tags related to a tag.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B5.
 *
 * Wraps `getRelatedTags` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/tags/{slug}/related` is non-paginated
 * (limit-bounded up to 100) per TKT-3.4.A1 §2.
 *
 * ## Drift note (TKT-3.4.A1 §2)
 *
 * The SDK uses `slug` as the parameter (URL is `/tags/{slug}/related`),
 * not `id` as the planning doc originally listed. The hook accepts
 * a `slug` and the detail page passes the same slug it uses for the
 * rest of the page.
 *
 * The SWR key is `['tag', slug, 'related', params]` so a different
 * tag (or a different `limit`) gets a separate cache entry.
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { getRelatedTags } from '@/features/tags/wrappers/tag.wrapper'

export interface UseTagRelatedParams {
  limit?: number
}

export interface UseTagRelatedResult {
  tags: readonly TagResponseDto[]
  isLoading: boolean
  error: ApiError | null
}

export function useTagRelated(
  slug: string,
  params: UseTagRelatedParams = {},
): UseTagRelatedResult {
  const key = ['tag', slug, 'related', params] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getRelatedTags(slug, { limit: params.limit })
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
