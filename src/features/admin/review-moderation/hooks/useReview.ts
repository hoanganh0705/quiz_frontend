"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import {
  getReviewById,
  type ReviewControllerGetReviewByIdResult,
} from "@/features/reviews/services/reviews.service";
import type { ReviewDetailResponseDto } from "@/lib/api/generated/schemas";

export interface UseReviewResult {
  review: ReviewDetailResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
}

async function fetchReview(
  reviewId: string,
): Promise<ReviewDetailResponseDto | null> {
  const wrapped: ReviewControllerGetReviewByIdResult =
    await getReviewById(reviewId);
  const envelope = wrapped as unknown as {
    data?: ReviewDetailResponseDto;
  };
  return envelope.data ?? null;
}

export const REVIEW_READ_KEY = (
  reviewId: string | null,
): ["admin", "review-moderation", "review", string | null] => [
  "admin",
  "review-moderation",
  "review",
  reviewId,
];

export function useReview(reviewId: string | null): UseReviewResult {
  const { data, isLoading, error } = useQuery<
    ReviewDetailResponseDto | null,
    ApiError
  >(
    {
      queryKey: REVIEW_READ_KEY(reviewId),
      queryFn: async () => {
        if (reviewId === null) {
          return null;
        }
        return fetchReview(reviewId);
      },
      enabled: reviewId !== null,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 5000,
    },
    getQueryClient(),
  );

  return {
    review: reviewId === null ? null : (data ?? null),
    isLoading: reviewId === null ? false : isLoading && data === undefined,
    error:
      reviewId === null
        ? null
        : error instanceof ApiError
          ? error
          : error
            ? new ApiError(error as any)
            : null,
  };
}
