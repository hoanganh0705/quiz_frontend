'use client';

import useSWR from 'swr';

import { ApiError } from '@/lib/api';

import {
getReviewById,
type ReviewControllerGetReviewByIdResult,
} from '@/features/reviews/services/reviews.service';
import type { ReviewDetailResponseDto } from '@/lib/api/generated/schemas';

export interface UseReviewResult {

review: ReviewDetailResponseDto | null;

isLoading: boolean;

error: ApiError | null;
}

async function fetchReview(reviewId: string): Promise<ReviewDetailResponseDto | null> {
const wrapped: ReviewControllerGetReviewByIdResult =
await getReviewById(reviewId);
const envelope = wrapped as unknown as {
data?: ReviewDetailResponseDto;
  };
return envelope.data ?? null;
}

export const REVIEW_READ_KEY = (
reviewId: string | null,
): ['admin', 'review-moderation', 'review', string | null] => [
'admin',
'review-moderation',
'review',
reviewId,
];

export function useReview(reviewId: string | null): UseReviewResult {

const { data, isLoading, error } = useSWR<ReviewDetailResponseDto | null, ApiError>(
REVIEW_READ_KEY(reviewId),
async () => {
if (reviewId === null) {
return null;
      }
return fetchReview(reviewId);
    },
{
revalidateOnFocus: false,
revalidateIfStale: false,
shouldRetryOnError: false,
    },
  );

return {
review: data ?? null,
isLoading: reviewId === null ? false : isLoading,
error: error instanceof ApiError ? error : null,
  };
}
