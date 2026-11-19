"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { PopularQuizItemDto } from "@/lib/api/generated/schemas";

import { getQuizzesPopular } from "@/features/quizzes/services/quizzes.service";

export interface UseQuizzesPopularParams {
  limit?: number;
  categoryId?: string;
}

export interface UseQuizzesPopularResult {
  quizzes: readonly PopularQuizItemDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useQuizzesPopular(
  params: UseQuizzesPopularParams = {},
): UseQuizzesPopularResult {
  const key = ["quizzes", "popular", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getQuizzesPopular(params);
        return result.data ?? [];
      },
    },
    getQueryClient(),
  );

  return {
    quizzes: data ?? [],
    isLoading,
    error: error instanceof ApiError ? error : null,
  };
}
