'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { QuizListItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesFeatured } from '@/features/quizzes/services/quizzes.service'

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
