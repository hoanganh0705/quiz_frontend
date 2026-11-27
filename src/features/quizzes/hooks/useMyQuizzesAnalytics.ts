"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getMyQuizAnalytics } from "@/features/quizzes/services/quizzes.service";

import type { MyQuizzesAnalytics } from "@/features/quizzes/types/my-quizzes";

export interface UseMyQuizzesAnalyticsResult {
  analytics: MyQuizzesAnalytics | null;
  isLoading: boolean;
  isValidating: boolean;
  error: ApiError | null;
}

export interface UseMyQuizzesAnalyticsOptions {
  enabled?: boolean;
}

export function useMyQuizzesAnalytics(
  options?: UseMyQuizzesAnalyticsOptions,
): UseMyQuizzesAnalyticsResult {
  const { data, error, isLoading, isFetching } = useQuery<
    MyQuizzesAnalytics,
    ApiError
  >(
    {
      queryKey: QUIZ_KEYS.mine("analytics"),
      queryFn: async () => {
        const result = await getMyQuizAnalytics();
        return result.data as MyQuizzesAnalytics;
      },
      enabled: options?.enabled ?? true,
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
