"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { getMyQuizAnalytics } from "@/features/quizzes/services/quizzes.service";
import type { MyQuizzesAnalytics } from "@/features/quizzes/types/my-quizzes";
import { myQuizzesKey } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesAnalyticsResult {
  analytics: MyQuizzesAnalytics | null;
  isLoading: boolean;
  isValidating: boolean;
  error: ApiError | null;
}

export function useMyQuizzesAnalytics(): UseMyQuizzesAnalyticsResult {
  const { data, error, isLoading, isFetching } = useQuery<
    MyQuizzesAnalytics,
    ApiError
  >(
    {
      queryKey: myQuizzesKey("analytics"),
      queryFn: async () => {
        const result = await getMyQuizAnalytics();
        return result.data as MyQuizzesAnalytics;
      },
    },
    getQueryClient(),
  );

  const normalisedError =
    error instanceof ApiError && error.status === 404 ? null : error;

  return {
    analytics: data ?? null,
    isLoading: isLoading && !error,
    isValidating: isFetching,
    error: normalisedError ?? null,
  };
}
