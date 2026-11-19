"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

import { getQuizzesFeatured } from "@/features/quizzes/services/quizzes.service";

export interface UseFeaturedQuizzesParams {
  limit?: number;
}

export interface UseFeaturedQuizzesResult {
  quizzes: readonly QuizListItemDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useFeaturedQuizzes(
  params: UseFeaturedQuizzesParams = {},
): UseFeaturedQuizzesResult {
  const key = ["quizzes", "featured", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getQuizzesFeatured(params);
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
