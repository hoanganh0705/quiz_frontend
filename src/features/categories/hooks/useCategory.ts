'use client'

/**
 * `useCategory` — single-entity fetch by slug.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.B3.
 *
 * Wraps `getCategoryBySlug` (the A2 service wrapper) in `useSWR`.
 * The detail page's primary data source — also the source for the
 * breadcrumb's canonical-slug lookup (Epic 3.3 F1).
 *
 * ## 404 → notFound contract (closes Story 3.3 AC #5)
 *
 * When the SDK throws an `ApiError` with `status === 404`, the hook
 * exposes `{ category: null, notFound: true, error: <ApiError> }`.
 * The detail page reads `notFound` to render the app's `NotFound`
 * component. A 5xx is exposed as `{ error: <ApiError>, notFound: false }`
 * so the page can render a generic error message with retry.
 *
 * ## Slug-only contract
 *
 * The SDK only exposes `categoryControllerGetCategoryBySlug` (slug-
 * only) per Epic 3.3 A1 §2. The route handler at
 * `src/app/(public)/categories/[idOrSlug]/page.tsx` is responsible
 * for treating the param as a slug (the planning doc's `:idOrSlug`
 * dual-mode contract is not honoured by the current wire).
 *
 * The SWR key is `['category', idOrSlug]` so two different categories
 * get separate cache entries; the F1 breadcrumb can rely on a
 * `categoryId === idOrSlug` mismatch resolving to the canonical
 * slug from the response payload.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { CategoryResponseDto } from '@/lib/api/generated/schemas'

import { getCategoryBySlug } from '@/features/categories/services/categories.service'

export interface UseCategoryResult {
  category: CategoryResponseDto | null
  isLoading: boolean
  error: ApiError | null
  /**
   * `true` when the SDK returned 404. The detail page renders the
   * `NotFound` component in this branch.
   */
  notFound: boolean
}

export function useCategory(idOrSlug: string): UseCategoryResult {
  const key = ['category', idOrSlug] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getCategoryBySlug(idOrSlug)
      return result.data ?? null
    },
    {
      // Inherit the global SwrProvider defaults.
    },
  )

  const apiError = error instanceof ApiError ? error : null
  const notFound = apiError?.status === 404

  return {
    category: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  }
}
