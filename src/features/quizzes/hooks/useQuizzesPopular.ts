"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { PopularQuizItemDto } from "@/lib/api/generated/schemas";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getQuizzesPopular } from "@/features/quizzes/services/quizzes.service";

export interface UseQuizzesPopularParams {
  limit?: number;
  categoryId?: string;
  enabled?: boolean;
}

export interface UseQuizzesPopularResult {
  quizzes: readonly PopularQuizItemDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useQuizzesPopular(
  params: UseQuizzesPopularParams = {},
): UseQuizzesPopularResult {
  const { limit, categoryId, enabled = true } = params;
  const queryParams = { limit, categoryId };
  const { data, error, isLoading } = useQuery(
    {
      queryKey: QUIZ_KEYS.popular(queryParams),
      queryFn: async () => {
        const result = await getQuizzesPopular(queryParams);
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
