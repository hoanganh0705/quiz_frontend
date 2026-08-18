'use client'

import useSWR from 'swr'

import { ApiError } from '@/lib/api'
import type { TrendingQuizItemDto } from '@/lib/api/generated/schemas'

import { getQuizzesTrending } from '@/features/quizzes/services/quizzes.service'

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