/**
 * Quizzes wrapper — wraps API calls with the custom API client.
 */

import { customInstance } from '@/lib/api/core/custom-instance';
import type {
  QuizResponseDto,
  QuizVersionDetailDto,
  QuizListResponse,
} from '@/features/quizzes/types';

// ─── Query Parameters ──────────────────────────────────────────────────────────

export interface ListQuizzesParams {
  cursor?: string
  limit?: number
  categorySlug?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  search?: string
  featured?: boolean
  creatorId?: string
}

// ─── Quiz Endpoints ─────────────────────────────────────────────────────────────

export async function listQuizzes(
  params?: ListQuizzesParams
): Promise<QuizListResponse> {
  const response = await customInstance.get<QuizListResponse>(
    '/quizzes',
    { params }
  );
  return response.data;
}

export async function getQuizBySlug(slug: string): Promise<QuizResponseDto> {
  const response = await customInstance.get<QuizResponseDto>(
    `/quizzes/${slug}`
  );
  return response.data;
}

// ─── Quiz Version Endpoints ──────────────────────────────────────────────────────

export async function getQuizVersionDetail(
  quizId: string,
  versionId: string
): Promise<QuizVersionDetailDto> {
  const response = await customInstance.get<QuizVersionDetailDto>(
    `/quizzes/${quizId}/versions/${versionId}`
  );
  return response.data;
}

// ─── Admin-only Functions ───────────────────────────────────────────────────────

export interface CreateQuizParams {
  title: string
  description?: string
  slug?: string
  requirements?: string
  imageUrl?: string
  isHidden?: boolean
}

export async function createQuiz(params: CreateQuizParams): Promise<QuizResponseDto> {
  const response = await customInstance.post<QuizResponseDto>(
    '/quizzes',
    params
  );
  return response.data;
}

export async function updateQuiz(
  id: string,
  params: Partial<CreateQuizParams>
): Promise<QuizResponseDto> {
  const response = await customInstance.patch<QuizResponseDto>(
    `/quizzes/${id}`,
    params
  );
  return response.data;
}

export async function deleteQuiz(id: string): Promise<{ message: string }> {
  const response = await customInstance.delete<{ message: string }>(
    `/quizzes/${id}`
  );
  return response.data;
}

// ─── Version Management ──────────────────────────────────────────────────────────

export interface CreateQuizVersionParams {
  difficulty: 'easy' | 'medium' | 'hard'
  durationMs: number
  passingScorePercent: number
  rewardXp: number
}

export async function createQuizVersion(
  quizId: string,
  params: CreateQuizVersionParams
): Promise<{ quizVersionId: string; versionNumber: number }> {
  const response = await customInstance.post<{ quizVersionId: string; versionNumber: number }>(
    `/quizzes/${quizId}/versions`,
    params
  );
  return response.data;
}

export async function publishQuizVersion(
  _quizId: string,
  versionId: string
): Promise<{ message: string }> {
  const response = await customInstance.post<{ message: string }>(
    `/quiz-versions/${versionId}/publish`
  );
  return response.data;
}

// ─── Question Management ────────────────────────────────────────────────────────

export interface AddQuestionParams {
  position: number
  questionText: string
  imageUrl?: string
  answerOptions: Array<{
    position: number
    value: string
    isCorrect: boolean
  }>
}

export async function addQuestion(
  quizId: string,
  versionId: string,
  params: AddQuestionParams
): Promise<{ questionId: string }> {
  const response = await customInstance.post<{ questionId: string }>(
    `/quizzes/${quizId}/versions/${versionId}/questions`,
    params
  );
  return response.data;
}

export async function addQuestionsBulk(
  quizId: string,
  versionId: string,
  questions: AddQuestionParams[]
): Promise<{ insertedCount: number }> {
  const response = await customInstance.post<{ insertedCount: number }>(
    `/quizzes/${quizId}/versions/${versionId}/questions/bulk`,
    { questions }
  );
  return response.data;
}
