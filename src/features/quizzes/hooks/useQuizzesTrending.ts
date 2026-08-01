'use client'

/**
 * `useQuizzesTrending` — non-paginated top list of trending quizzes.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.B3.
 *
 * Wraps `getQuizzesTrending` (the A2 service wrapper) in `useSWR`.
 * The endpoint `/quizzes/trending` is non-paginated (limit-bounded
 * up to 100) per TKT-3.5.A1 §2.3.
 *
 * The hook returns `TrendingQuizItemDto[]` — NOT `QuizListItemDto[]`
 * (see TKT-3.5.A1 §6 drift #6). The wire DTO carries extra fields
 * (`rank`, `trendingScore`, `recentAttempts`) that the
 * `<HomePageTrendingStrip />` consumer (Batch C/D) projects onto
 * the `<QuizCard />` slot primitive.
 *
 * The SWR key is `['quizzes', 'trending', params]` — separate from
 * the popular key so the two strips get independent cache entries.
 * The hook never uses `useCursorPaginated` (the endpoint is
 * non-paginated; using the cursor primitive would be a contract
 * violation).
 *
 * The hook is read-only — no mutation, no optimistic update.
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TrendingQuizItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesTrending } from '@/features/quizzes/api/quizzes.wrapper'

export interface UseQuizzesTrendingParams {
  limit?: number
  categoryId?: string
}

export interface UseQuizzesTrendingResult {
  quizzes: readonly TrendingQuizItemDto[]
  isLoading: boolean
  error: ApiError | null
}

export function useQuizzesTrending(
  params: UseQuizzesTrendingParams = {},
): UseQuizzesTrendingResult {
  const key = ['quizzes', 'trending', params] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getQuizzesTrending(params)
      return result.data ?? []
    },
    {
      // Inherit the global SwrProvider defaults.
    },
  )

  return {
    quizzes: data ?? [],
    isLoading,
    error: error instanceof ApiError ? error : null,
  }
}