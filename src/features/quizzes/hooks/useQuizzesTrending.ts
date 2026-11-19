"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { TrendingQuizItemDto } from "@/lib/api/generated/schemas";

import { getQuizzesTrending } from "@/features/quizzes/services/quizzes.service";

export interface UseQuizzesTrendingParams {
  limit?: number;
  categoryId?: string;
}

export interface UseQuizzesTrendingResult {
  quizzes: readonly TrendingQuizItemDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useQuizzesTrending(
  params: UseQuizzesTrendingParams = {},
): UseQuizzesTrendingResult {
  const key = ["quizzes", "trending", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getQuizzesTrending(params);
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
