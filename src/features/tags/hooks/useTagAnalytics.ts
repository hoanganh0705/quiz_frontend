'use client'

/**
 * `useTagAnalytics` — single-entity analytics fetch by tag id.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B5.
 *
 * Wraps `getTagAnalytics` (the A2 service wrapper) in `useSWR`.
 * The detail page's `TagAnalyticsPanel` data source.
 *
 * The SWR key is `['tag', id, 'analytics']` — keyed by `id` (UUIDv7),
 * matching the on-wire route `/tags/:id/analytics`. The detail page
 * resolves the `id` from the `useTagBySlug` response payload
 * (`tag.tagId`) and passes it here.
 *
 * ## 404 → "no data yet" zero-state contract (closes Story 3.4 line 461)
 *
 * The backend returns 404 for a fresh tag with no analytics. The
 * hook treats this as the documented zero-state — `{ analytics: null,
 * error: null }` — so the `TagAnalyticsPanel` can render the
 * "Analytics will populate after activity" copy without surfacing a
 * page-level error. A 5xx is exposed as `{ analytics: null, error: <ApiError> }`
 * so the panel can render a generic error + retry.
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagAnalyticsResponseDto } from '@/lib/api/generated/schemas'

import { getTagAnalytics } from '@/features/tags/wrappers/tag.wrapper'

export interface UseTagAnalyticsResult {
  analytics: TagAnalyticsResponseDto | null
  isLoading: boolean
  error: ApiError | null
}

export function useTagAnalytics(id: string): UseTagAnalyticsResult {
  const key = ['tag', id, 'analytics'] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getTagAnalytics(id)
      return result.data ?? null
    },
    {
      // Inherit the global SwrProvider defaults.
    },
  )

  const apiError = error instanceof ApiError ? error : null
  // 404 is the documented zero-state (fresh tag with no activity) —
  // the panel renders the "Analytics will populate after activity" copy
  // rather than treating it as a hard error. Per Story 3.4 line 461.
  const isNotFound = apiError?.status === 404

  return {
    analytics: isNotFound ? null : (data ?? null),
    isLoading,
    error: isNotFound ? null : apiError,
  }
}
