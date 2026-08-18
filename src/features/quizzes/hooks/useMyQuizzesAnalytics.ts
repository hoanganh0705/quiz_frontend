'use client';

import useSWR from "swr";

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
const { data, error, isLoading, isValidating } = useSWR<
MyQuizzesAnalytics,
ApiError
  >(
myQuizzesKey("analytics"),
async () => {
const result = await getMyQuizAnalytics();
return result.data as MyQuizzesAnalytics;
    },
{
      // Inherit the global SwrProvider defaults.
    },
  );

const normalisedError =
error instanceof ApiError && error.status === 404 ? null : error;

return {
analytics: data ?? null,
isLoading,
isValidating,
error: normalisedError ?? null,
  };
}
