"use client";

import { useCallback } from "react";

import { useQuery } from "@tanstack/react-query";

import { coerceToApiError } from "@/lib/api";

import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { REVIEW_KEYS } from "@/features/reviews/query-keys";
import { getMyQuizReview } from "@/features/reviews/services/reviews.service";

import type { ApiError } from "@/lib/api";
import type { MyReviewDto } from "@/features/reviews/types";

export interface UseMyQuizReviewResult {
  review: MyReviewDto | null;
  isLoading: boolean;
  hasResolved: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

export interface UseMyQuizReviewParams {
  quizId: string | null;
}

export function useMyQuizReview(
  params: UseMyQuizReviewParams,
): UseMyQuizReviewResult {
  const { quizId } = params;

  const sessionId = useAuthSessionId();

  const enabled = quizId !== null && sessionId !== null;

  const query = useQuery<MyReviewDto | null, ApiError>({
    queryKey: enabled
      ? REVIEW_KEYS.mine(quizId, sessionId)
      : ["reviews", "mine", "disabled"],
    queryFn: async () => {
      if (!quizId) return null;
      const result = await getMyQuizReview(quizId);
      return result ? { ...result, id: result.reviewId } : null;
    },
    enabled,
    retry: false,
  });

  const isLoading = enabled ? query.isPending : false;
  const error =
    enabled && query.error ? coerceToApiError(query.error) : null;
  const hasResolved =
    enabled && !isLoading && (query.data !== undefined || error !== null);

  const stableRetry = useCallback(async () => {
    if (!enabled) return;
    await query.refetch();
  }, [enabled, query]);

  return {
    review: enabled ? (query.data ?? null) : null,
    isLoading,
    hasResolved,
    error,
    retry: stableRetry,
  };
}
