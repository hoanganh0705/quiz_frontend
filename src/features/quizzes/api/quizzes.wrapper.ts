/**
 * Quizzes wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 */

import { getQuizzes } from '@/lib/api/generated/quizzes/quizzes';
import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizVersionDto,
  UpdateQuizVersionDto,
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
} from '@/lib/api/generated/schemas';

// Re-export types for convenience
export type {
  QuizControllerCreateQuizResult,
  QuizControllerListQuizzesResult,
  QuizControllerGetQuizBySlugResult,
  QuizControllerUpdateQuizResult,
  QuizControllerDeleteQuizResult,
  QuizControllerCreateQuizVersionResult,
  QuizControllerListQuizVersionsResult,
  QuizControllerCreateQuizQuestionResult,
  QuizControllerCreateQuizQuestionsResult,
  QuizVersionControllerUpdateQuizVersionResult,
  QuizVersionControllerPublishQuizVersionResult,
} from '@/lib/api/generated/quizzes/quizzes';

// ─── Query Parameters ──────────────────────────────────────────────────────────

export interface ListQuizzesParams {
  cursor?: string
  limit?: number
  categoryId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  search?: string
  featured?: boolean
  creatorId?: string
}

// ─── Quiz Endpoints ─────────────────────────────────────────────────────────────

export async function listQuizzes(params?: ListQuizzesParams) {
  const sdk = getQuizzes();
  return sdk.quizControllerListQuizzes(params);
}

export async function getQuizBySlug(slug: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetQuizBySlug(slug);
}

// ─── Admin-only Functions ───────────────────────────────────────────────────────

export async function createQuiz(params: CreateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuiz(params);
}

export async function updateQuiz(id: string, params: UpdateQuizDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerUpdateQuiz(id, params);
}

export async function deleteQuiz(id: string) {
  const sdk = getQuizzes();
  return sdk.quizControllerDeleteQuiz(id);
}

// ─── Version Management ──────────────────────────────────────────────────────────

export async function createQuizVersion(quizId: string, params: CreateQuizVersionDto) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizVersion(quizId, params);
}

export async function listQuizVersions(
  quizId: string,
  params?: { cursor?: string; limit?: number }
) {
  const sdk = getQuizzes();
  return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function updateQuizVersion(versionId: string, params: UpdateQuizVersionDto) {
  const sdk = getQuizzes();
  return sdk.quizVersionControllerUpdateQuizVersion(versionId, params);
}

export async function publishQuizVersion(versionId: string) {
  const sdk = getQuizzes();
  return sdk.quizVersionControllerPublishQuizVersion(versionId);
}

// ─── Question Management ────────────────────────────────────────────────────────

export async function addQuestion(
  quizId: string,
  versionId: string,
  params: CreateQuizQuestionDto
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestion(quizId, versionId, params);
}

export async function addQuestionsBulk(
  quizId: string,
  versionId: string,
  params: CreateQuizQuestionsDto
) {
  const sdk = getQuizzes();
  return sdk.quizControllerCreateQuizQuestions(quizId, versionId, params);
}
