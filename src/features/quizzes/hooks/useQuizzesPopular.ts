'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { PopularQuizItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesPopular } from '@/features/quizzes/services/quizzes.service'

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