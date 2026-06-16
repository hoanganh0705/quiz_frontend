/**
 * Reviews wrapper — wraps API calls for quiz reviews.
 * Uses the generated SDK from orval.
 */

import { getReviews } from '@/lib/api/generated/reviews/reviews';
import type {
  CreateReviewDto,
  UpdateReviewDto,
} from '@/lib/api/generated/schemas';

export type {
  ReviewControllerCreateReviewResult,
  ReviewControllerListReviewsResult,
  ReviewControllerUpdateReviewResult,
  ReviewControllerDeleteReviewResult,
} from '@/lib/api/generated/reviews/reviews';

export interface ListReviewsParams {
  cursor?: string
  limit?: number
}

export async function getReviews(quizId: string, params?: ListReviewsParams) {
  const sdk = getReviews();
  return sdk.reviewControllerListReviews(quizId, params);
}

export async function createReview(
  quizId: string,
  params: CreateReviewDto
) {
  const sdk = getReviews();
  return sdk.reviewControllerCreateReview(quizId, params);
}

export async function updateReview(
  quizId: string,
  params: UpdateReviewDto
) {
  const sdk = getReviews();
  return sdk.reviewControllerUpdateReview(quizId, params);
}

export async function deleteReview(quizId: string) {
  const sdk = getReviews();
  return sdk.reviewControllerDeleteReview(quizId);
}
