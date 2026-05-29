/**
 * Attempts wrapper — wraps API calls for quiz attempts.
 */

import { customInstance } from '@/lib/api/core/custom-instance';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AttemptResponseDto {
  attemptId: string
  quizId: string
  quizVersionId: string
  userId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeMs: number
  startedAt: string
  completedAt: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
}

export interface AttemptListResponse {
  items: AttemptResponseDto[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function startAttempt(quizId: string): Promise<{
  attemptId: string
  quizVersionId: string
}> {
  const response = await customInstance.post<{
    attemptId: string
    quizVersionId: string
  }>(`/quizzes/${quizId}/attempts`);
  return response.data;
}

export async function getAttempt(attemptId: string): Promise<AttemptResponseDto> {
  const response = await customInstance.get<AttemptResponseDto>(
    `/attempts/${attemptId}`
  );
  return response.data;
}

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string
): Promise<{ isCorrect: boolean; correctOptionId: string }> {
  const response = await customInstance.post<{
    isCorrect: boolean
    correctOptionId: string
  }>(`/attempts/${attemptId}/answers`, {
    questionId,
    selectedOptionId,
  });
  return response.data;
}

export async function abandonAttempt(attemptId: string): Promise<AttemptResponseDto> {
  const response = await customInstance.post<AttemptResponseDto>(
    `/attempts/${attemptId}/abandon`
  );
  return response.data;
}

export async function completeAttempt(attemptId: string): Promise<AttemptResponseDto> {
  const response = await customInstance.post<AttemptResponseDto>(
    `/attempts/${attemptId}/complete`
  );
  return response.data;
}

export async function getMyAttempts(params?: {
  cursor?: string
  limit?: number
}): Promise<AttemptListResponse> {
  const response = await customInstance.get<AttemptListResponse>(
    '/users/me/attempts',
    { params }
  );
  return response.data;
}
