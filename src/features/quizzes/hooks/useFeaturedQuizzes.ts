'use client'

/**
 * `useFeaturedQuizzes` — non-paginated `useSWR` hook against
 * `getQuizzesFeatured` for the featured rail.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C1.
 *
 * The endpoint `/quizzes/featured` is a fixed editorial set
 * (Story 3.7 line 754 / TKT-3.7.A1 §2.1) — non-paginated, returns
 * `QuizListItemDto[]`. The hook wraps `getQuizzesFeatured` in `useSWR`,
 * NOT `useCursorPaginated` (the endpoint is non-paginated per
 * TKT-3.7.A1 §2.1).
 *
 * The hook is read-only — no mutation, no optimistic update. The
 * retry affordance lives in the consumer (C2's `HomeFeaturedRail`
 * exposes a "Retry" button that calls SWR's global `mutate(key)`;
 * the hook does not expose its own mutate).
 *
 * The hook does NOT accept a `categoryId` parameter (the featured
 * endpoint does not accept one per TKT-3.7.A1 §4.1 — featured is
 * editorial-fixed).
 */

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesFeatured } from '@/features/quizzes/api/quizzes.wrapper'

export interface UseFeaturedQuizzesParams {
  limit?: number
}

export interface UseFeaturedQuizzesResult {
  quizzes: readonly QuizListItemDto[]
  isLoading: boolean
  error: ApiError | null
}

export function useFeaturedQuizzes(
  params: UseFeaturedQuizzesParams = {},
): UseFeaturedQuizzesResult {
  const key = ['quizzes', 'featured', params] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const result = await getQuizzesFeatured(params)
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
