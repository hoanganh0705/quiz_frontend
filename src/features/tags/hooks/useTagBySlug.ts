'use client'

/**
 * `useTagBySlug` — single-entity tag fetch by slug.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.B3.
 *
 * Wraps `getTagBySlug` (the A2 service wrapper) in `useSWR`.
 * The detail page's primary data source — also the source for the
 * breadcrumb's canonical-slug lookup (F2).
 *
 * ## 404 → notFound contract (closes Story 3.4 AC #5)
 *
 * When the SDK throws an `ApiError` with `status === 404`, the hook
 * exposes `{ tag: null, notFound: true, error: <ApiError> }`.
 * The detail page reads `notFound` to render the app's `NotFound`
 * component. A 5xx is exposed as `{ error: <ApiError>, notFound: false }`
 * so the page can render a generic error message with retry.
 *
 * ## Slug-only contract
 *
 * The SDK exposes `tagControllerGetTagBySlug` (slug-only) per
 * TKT-3.4.A1 §2. The route handler at
 * `src/app/(public)/tags/[slug]/page.tsx` is responsible for
 * treating the param as a slug (the planning doc's `/tags/:id`
 * alternative is not honoured by the current wire).
 *
 * The SWR key is `['tag', slug]` so two different tags get
 * separate cache entries; the breadcrumb can rely on a
 * `tagId === slug` mismatch resolving to the canonical slug
 * from the response payload.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TagResponseDto } from '@/lib/api/generated/schemas'

import { getTagBySlug } from '@/features/tags/services/tags.service'

export interface UseTagBySlugResult {
  tag: TagResponseDto | null
  isLoading: boolean
  error: ApiError | null
  /**
   * `true` when the SDK returned 404. The detail page renders the
   * `NotFound` component in this branch.
   */
  notFound: boolean
}

export function useTagBySlug(slug: string): UseTagBySlugResult {
  const key = ['tag', slug] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getTagBySlug(slug)
      return result.data ?? null
    },
    {
      // Inherit the global SwrProvider defaults.
    },
  )

  const apiError = error instanceof ApiError ? error : null
  const notFound = apiError?.status === 404

  return {
    tag: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  }
}
