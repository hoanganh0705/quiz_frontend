'use client'

/**
 * `useQuizzesPopular` — non-paginated top list of popular quizzes.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.B2.
 *
 * Wraps `getQuizzesPopular` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/quizzes/popular` is non-paginated (limit-bounded
 * up to 100) per TKT-3.5.A1 §2.2.
 *
 * The hook returns `PopularQuizItemDto[]` — NOT `QuizListItemDto[]`
 * (see TKT-3.5.A1 §6 drift #6). The wire DTO carries extra fields
 * (`rank`, `popularityScore`, `averageRating`, `bookmarkCount`) that
 * the `<HomePagePopularStrip />` consumer (Batch C/D) projects onto
 * the `<QuizCard />` slot primitive.
 *
 * The SWR key is `['quizzes', 'popular', params]` so a different
 * `limit` produces a separate cache entry. The hook never uses
 * `useCursorPaginated` (the endpoint is non-paginated; using the
 * cursor primitive would be a contract violation).
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { PopularQuizItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesPopular } from '@/features/quizzes/api/quizzes.wrapper'

export interface UseQuizzesPopularParams {
  limit?: number
  categoryId?: string
}

export interface UseQuizzesPopularResult {
  quizzes: readonly PopularQuizItemDto[]
  isLoading: boolean
  error: ApiError | null
}

export function useQuizzesPopular(
  params: UseQuizzesPopularParams = {},
): UseQuizzesPopularResult {
  const key = ['quizzes', 'popular', params] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getQuizzesPopular(params)
      return result.data ?? []
    },
    {
      // Inherit the global SwrProvider defaults (`revalidateOnFocus: false`,
      // `dedupingInterval: 2_000`, `errorRetryCount: 3`). No per-call overrides.
    },
  )

  return {
    quizzes: data ?? [],
    isLoading,
    error: error instanceof ApiError ? error : null,
  }
}