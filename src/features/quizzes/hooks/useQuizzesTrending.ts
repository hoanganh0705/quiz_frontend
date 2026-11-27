"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { TrendingQuizItemDto } from "@/lib/api/generated/schemas";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getQuizzesTrending } from "@/features/quizzes/services/quizzes.service";

export interface UseQuizzesTrendingParams {
  limit?: number;
  categoryId?: string;
  enabled?: boolean;
}

export interface UseQuizzesTrendingResult {
  quizzes: readonly TrendingQuizItemDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useQuizzesTrending(
  params: UseQuizzesTrendingParams = {},
): UseQuizzesTrendingResult {
  const { limit, categoryId, enabled = true } = params;
  const queryParams = { limit, categoryId };
  const { data, error, isLoading } = useQuery(
    {
      queryKey: QUIZ_KEYS.trending(queryParams),
      queryFn: async () => {
        const result = await getQuizzesTrending(queryParams);
        return result.data ?? [];
      },
      enabled,
    },
    getQueryClient(),
  );

  return {
    quizzes: data ?? [],
    isLoading,
    error: error ? coerceToApiError(error) : null,
  };
}
