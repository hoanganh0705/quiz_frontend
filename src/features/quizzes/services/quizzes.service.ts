

import { getQuizzes } from '@/lib/api';

import type {
CreateQuizDto,
UpdateQuizDto,
CreateQuizVersionDto,
UpdateQuizVersionDto,
CreateQuizQuestionDto,
CreateQuizQuestionsDto,
QuizResponseDto,
QuizStatsResponseDto,
} from '@/lib/api/generated/schemas';

export type {
QuizControllerCreateQuizResult,
QuizControllerUpdateQuizResult,
QuizControllerDeleteQuizResult,
QuizControllerListMyQuizzesResult,
QuizControllerListMyDraftQuizzesResult,
QuizControllerListMyPublishedQuizzesResult,
QuizControllerGetMyQuizAnalyticsResult,
QuizControllerCreateQuizVersionResult,
QuizControllerListQuizVersionsResult,
QuizControllerGetQuizVersionDetailResult,
QuizControllerUpdateQuizVersionResult,
QuizControllerPublishQuizVersionResult,
QuizControllerCreateQuizQuestionResult,
QuizControllerCreateQuizQuestionsResult,
} from '@/lib/api/generated/quizzes/quizzes';

export interface ListMyQuizzesParams {
cursor?: string;
limit?: number;
}

export async function createQuiz(payload: CreateQuizDto) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuiz(payload);
}

export async function updateQuiz(quizId: string, payload: UpdateQuizDto) {
const sdk = getQuizzes();
return sdk.quizControllerUpdateQuiz(quizId, payload);
}

export async function deleteQuiz(quizId: string) {
const sdk = getQuizzes();
return sdk.quizControllerDeleteQuiz(quizId);
}

export async function getMyQuizzes(params?: ListMyQuizzesParams) {
const sdk = getQuizzes();
return sdk.quizControllerListMyQuizzes(params);
}

export async function getMyQuizzesDrafts(params?: ListMyQuizzesParams) {
const sdk = getQuizzes();
return sdk.quizControllerListMyDraftQuizzes(params);
}

export async function getMyQuizzesPublished(params?: ListMyQuizzesParams) {
const sdk = getQuizzes();
return sdk.quizControllerListMyPublishedQuizzes(params);
}

export async function getMyQuizAnalytics() {
const sdk = getQuizzes();
return sdk.quizControllerGetMyQuizAnalytics();
}

export async function createQuizVersion(
quizId: string,
payload: CreateQuizVersionDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuizVersion(quizId, payload);
}

export async function getQuizVersions(quizId: string, params?: ListMyQuizzesParams) {
const sdk = getQuizzes();
return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function getQuizVersionDetail(quizId: string, versionId: string) {
const sdk = getQuizzes();
return sdk.quizControllerGetQuizVersionDetail(quizId, versionId);
}

export async function updateQuizVersion(
quizId: string,
versionId: string,
payload: UpdateQuizVersionDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerUpdateQuizVersion(quizId, versionId, payload);
}

export async function publishQuizVersion(quizId: string, versionId: string) {
const sdk = getQuizzes();
return sdk.quizControllerPublishQuizVersion(quizId, versionId);
}

export async function createQuizQuestion(
quizId: string,
versionId: string,
payload: CreateQuizQuestionDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuizQuestion(quizId, versionId, payload);
}

export async function bulkCreateQuizQuestions(
quizId: string,
versionId: string,
payload: CreateQuizQuestionsDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuizQuestions(quizId, versionId, payload);
}

export interface ListQuizzesParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  difficulty?: "easy" | "medium" | "hard";
  tagIds?: string[];
  creatorId?: string;
  featured?: boolean;
  /**
   * Aborts the underlying request when fired. The generated SDK signature
   * does not declare it, but Axios forwards `signal` natively; this cast
   * threads it through without touching generated code.
   */
  signal?: AbortSignal;
}

export async function listQuizzes(params?: ListQuizzesParams) {
  const sdk = getQuizzes();
  const forwarded: Record<string, unknown> = {};
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  if (params?.categoryId !== undefined) forwarded.categoryId = params.categoryId;
  if (params?.difficulty !== undefined) forwarded.difficulty = params.difficulty;
  if (params?.tagIds !== undefined) forwarded.tagIds = params.tagIds;
  if (params?.creatorId !== undefined) forwarded.creatorId = params.creatorId;
  if (params?.featured !== undefined) forwarded.featured = params.featured;
  if (params?.signal !== undefined) forwarded.signal = params.signal;
  return sdk.quizControllerListQuizzes(
    forwarded as Parameters<typeof sdk.quizControllerListQuizzes>[0],
  );
}

export async function getQuizzesPopular(params?: {
limit?: number;
categoryId?: string;
}) {
const sdk = getQuizzes();
return sdk.quizControllerGetPopularQuizzes(params);
}

export async function getQuizzesTrending(params?: {
limit?: number;
categoryId?: string;
}) {
const sdk = getQuizzes();
return sdk.quizControllerGetTrendingQuizzes(params);
}

export async function getQuizzesFeatured(params?: { limit?: number }) {
const sdk = getQuizzes();
return sdk.quizControllerGetFeaturedQuizzes(params);
}

export async function getQuizByIdOrSlug(
idOrSlug: string,
): Promise<QuizResponseDto | null> {
const sdk = getQuizzes();
const envelope = await sdk.quizControllerGetQuizById(idOrSlug);
return envelope?.data ?? null;
}

export async function getQuizStatsByIdOrSlug(
idOrSlug: string,
): Promise<QuizStatsResponseDto | null> {
const sdk = getQuizzes();
const envelope = await sdk.quizControllerGetQuizStats(idOrSlug);
return envelope?.data ?? null;
}

export async function getQuizzesRelated(idOrSlug: string, params?: { limit?: number }) {
const sdk = getQuizzes();
return sdk.quizControllerGetRelatedQuizzes(idOrSlug, params);
}

export async function getQuizBySlug(slug: string) {
return getQuizByIdOrSlug(slug);
}

export async function getQuizVersionsV3(
quizId: string,
params?: { cursor?: string; limit?: number },
) {
const sdk = getQuizzes();
return sdk.quizControllerListQuizVersions(quizId, params);
}

export async function updateQuizVersionV3(
quizId: string,
versionId: string,
payload: UpdateQuizVersionDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerUpdateQuizVersion(quizId, versionId, payload);
}

export async function publishQuizVersionV3(quizId: string, versionId: string) {
const sdk = getQuizzes();
return sdk.quizControllerPublishQuizVersion(quizId, versionId);
}

export async function addQuestion(
quizId: string,
versionId: string,
payload: CreateQuizQuestionDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuizQuestion(quizId, versionId, payload);
}

export async function addQuestionsBulk(
quizId: string,
versionId: string,
payload: CreateQuizQuestionsDto,
) {
const sdk = getQuizzes();
return sdk.quizControllerCreateQuizQuestions(quizId, versionId, payload);
}