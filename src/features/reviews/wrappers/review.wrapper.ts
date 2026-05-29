/**
 * Reviews wrapper — wraps API calls for quiz reviews.
 */

import { customInstance } from '@/lib/api/core/custom-instance';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewResponseDto {
  reviewId: string
  quizId: string
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface ReviewListResponse {
  items: ReviewResponseDto[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function getReviews(
  quizId: string,
  params?: { cursor?: string; limit?: number }
): Promise<ReviewListResponse> {
  const response = await customInstance.get<ReviewListResponse>(
    `/quizzes/${quizId}/reviews`,
    { params }
  );
  return response.data;
}

export interface CreateReviewParams {
  rating: number
  comment: string
}

export async function createReview(
  quizId: string,
  params: CreateReviewParams
): Promise<ReviewResponseDto> {
  const response = await customInstance.post<ReviewResponseDto>(
    `/quizzes/${quizId}/reviews`,
    params
  );
  return response.data;
}

export async function updateReview(
  quizId: string,
  params: Partial<CreateReviewParams>
): Promise<ReviewResponseDto> {
  const response = await customInstance.patch<ReviewResponseDto>(
    `/quizzes/${quizId}/reviews`,
    params
  );
  return response.data;
}

export async function deleteReview(quizId: string): Promise<{ message: string }> {
  const response = await customInstance.delete<{ message: string }>(
    `/quizzes/${quizId}/reviews`
  );
  return response.data;
}
