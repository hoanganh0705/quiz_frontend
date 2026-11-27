import { getAdminQuizzes, getHome, getQuizzes } from "@/lib/api";

import type {
  AdminUpdateQuizDto,
  CreateQuizDto,
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
  CreateQuizVersionDto,
  HomeControllerGetBundle200,
  QuizResponseDto,
  QuizStatsResponseDto,
  UpdateQuizDto,
  UpdateQuizVersionDto,
} from "@/lib/api/generated/schemas";
import type {
  BulkCreateQuestionsDto,
  BulkQuestionsResultDto,
  CreateQuestionDto,
  QuizAuthorQuestionDto,
} from "@/features/quizzes/types/author-dtos";

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
} from "@/lib/api/generated/quizzes/quizzes";

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

export async function adminUpdateQuiz(
  quizId: string,
  payload: AdminUpdateQuizDto,
) {
  const sdk = getAdminQuizzes();
  return sdk.quizAdminControllerAdminUpdate(quizId, payload);
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

export async function getQuizVersions(
  quizId: string,
  params?: ListMyQuizzesParams,
) {
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
  q?: string;
  cursor?: string;
  limit?: number;
  categoryId?: string;
  difficulty?: "easy" | "medium" | "hard";
  tagIds?: string[];
  creatorId?: string;
  featured?: boolean;
  isHidden?: boolean;
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
  if (params?.q !== undefined && params.q.trim().length > 0) {
    forwarded.q = params.q.trim();
  }
  if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
  if (params?.limit !== undefined) forwarded.limit = params.limit;
  if (params?.categoryId !== undefined)
    forwarded.categoryId = params.categoryId;
  if (params?.difficulty !== undefined)
    forwarded.difficulty = params.difficulty;
  if (params?.tagIds !== undefined) forwarded.tagIds = params.tagIds;
  if (params?.creatorId !== undefined) forwarded.creatorId = params.creatorId;
  if (params?.featured !== undefined) forwarded.featured = params.featured;
  if (params?.isHidden !== undefined) forwarded.isHidden = params.isHidden;
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

export async function getQuizzesRelated(
  idOrSlug: string,
  params?: { limit?: number },
) {
  const sdk = getQuizzes();
  return sdk.quizControllerGetRelatedQuizzes(idOrSlug, params);
}

export async function getQuizBySlug(slug: string) {
  return getQuizByIdOrSlug(slug);
}

export type HomeBundleData = NonNullable<HomeControllerGetBundle200["data"]>;
export type FeaturedRefreshHandle = (data: HomeBundleData | null) => void;

export async function refreshHomeBundle(): Promise<HomeBundleData | null> {
  const envelope = await getHome().homeControllerGetBundle();
  return (envelope?.data as HomeBundleData | undefined) ?? null;
}

export async function listVersionQuestions(
  quizId: string,
  versionId: string,
): Promise<{ questions: QuizAuthorQuestionDto[] }> {
  const sdk = getQuizzes();
  const response = await sdk.quizControllerGetQuizVersionDetail(
    quizId,
    versionId,
  );
  const questions = response.data?.questions ?? [];

  return { questions };
}

export async function createVersionQuestion(
  quizId: string,
  versionId: string,
  payload: CreateQuestionDto,
): Promise<QuizAuthorQuestionDto> {
  const sdk = getQuizzes();
  const sdkPayload: CreateQuizQuestionDto = {
    position: payload.position,
    questionText: payload.questionText,
    imageUrl: payload.imageUrl,
    ...(payload.questionType !== undefined
      ? { questionType: payload.questionType }
      : {}),
    answerOptions: payload.answerOptions,
  };

  const response = await sdk.quizControllerCreateQuizQuestion(
    quizId,
    versionId,
    sdkPayload,
  );

  const data = response.data;
  if (!data) {
    throw new Error(
      "Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions",
    );
  }

  return data;
}

export async function bulkCreateVersionQuestions(
  quizId: string,
  versionId: string,
  payload: BulkCreateQuestionsDto,
): Promise<BulkQuestionsResultDto> {
  const sdk = getQuizzes();
  const sdkPayload: CreateQuizQuestionsDto = {
    questions: payload.questions.map((q) => ({
      position: q.position,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      ...(q.questionType !== undefined ? { questionType: q.questionType } : {}),
      answerOptions: q.answerOptions,
    })),
  };

  const response = await sdk.quizControllerCreateQuizQuestions(
    quizId,
    versionId,
    sdkPayload,
  );

  const data = response.data;
  if (!data) {
    throw new Error(
      "Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions/bulk",
    );
  }

  const createdQuestions = data.questions ?? [];
  const results: BulkQuestionsResultDto["results"] = data.results
    ? data.results.map((r) => ({
        index: r.index,
        status: r.status,
        code: r.code ?? "",
        message: r.message ?? "",
        questionId: typeof r.questionId === "string" ? r.questionId : undefined,
      }))
    : createdQuestions.map((q, i) => ({
        index: i,
        status: 201,
        code: "",
        message: "",
        questionId: q.questionId,
      }));

  return {
    questions: createdQuestions,
    results,
  };
}
