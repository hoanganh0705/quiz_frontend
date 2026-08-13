/**
 * Question service — Phase 4 question editor service layer.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.4.
 *
 * Thin pass-through wrappers to the generated SDK for question operations.
 * These functions are consumed by the question editor hooks (T-4.10.5, T-4.10.6, T-4.10.7).
 *
 * ## Pattern: thin pass-through
 *
 * Like the existing `quizzes.service.ts`, this service wraps the generated SDK
 * (`getQuizzes()`) with typed interfaces. Error handling (ApiError propagation)
 * is owned by the per-feature hooks, not this service.
 *
 * ## API Endpoints
 *
 * - `GET /quizzes/:id/versions/:versionId/questions` — list version questions
 * - `POST /quizzes/:id/versions/:versionId/questions` — create single question
 * - `POST /quizzes/:id/versions/:versionId/questions/bulk` — bulk create questions
 *
 * @see `@/lib/api/generated/quizzes/quizzes.ts` — generated SDK
 */

import { getQuizzes } from '@/lib/api';

import type {
  CreateQuizQuestionDto,
  CreateQuizQuestionsDto,
  CreateQuizAnswerOptionDto,
  QuizQuestionAuthorDto,
  BulkQuizQuestionsResponseDto,
} from '@/lib/api/generated/schemas';

import type {
  QuizAuthorQuestionDto,
  BulkQuestionsResultDto,
  CreateQuestionDto,
  BulkCreateQuestionsDto,
} from '@/features/quizzes/types/author-dtos';

// Re-export result types for convenience
export type {
  QuizControllerCreateQuizQuestionResult,
  QuizControllerCreateQuizQuestionsResult,
} from '@/lib/api/generated/quizzes/quizzes';

// ─── Service functions ────────────────────────────────────────────────────

/**
 * List questions for a quiz version.
 *
 * Note: The current SDK does not expose a dedicated list endpoint for version
 * questions. Questions are fetched as part of `getQuizVersionDetail`. This function
 * serves as a placeholder for when the backend exposes a dedicated endpoint.
 *
 * Until then, use `getQuizVersionDetail` and extract `questions` from the response.
 *
 * @param quizId - Quiz UUID
 * @param versionId - Quiz version UUID
 * @param params - Optional pagination params
 * @returns Paginated questions list
 */
export async function listVersionQuestions(
  quizId: string,
  versionId: string,
  params?: { cursor?: string; limit?: number },
): Promise<{ questions: QuizAuthorQuestionDto[]; nextCursor?: string }> {
  const sdk = getQuizzes();
  // Current SDK: fetch version detail and extract questions
  // TODO: Replace with dedicated list endpoint when exposed by backend
  const response = await sdk.quizControllerGetQuizVersionDetail(quizId, versionId);

  const data = (response as unknown as { data?: { questions?: QuizQuestionAuthorDto[] } }).data;
  const questions = data?.questions ?? [];

  return {
    questions: questions as unknown as QuizAuthorQuestionDto[],
    nextCursor: undefined, // TODO: Add cursor pagination when endpoint supports it
  };
}

/**
 * Create a single question for a quiz version.
 *
 * @param quizId - Quiz UUID
 * @param versionId - Quiz version UUID
 * @param payload - Question creation payload
 * @returns Created question (author view with isCorrect)
 */
export async function createVersionQuestion(
  quizId: string,
  versionId: string,
  payload: CreateQuestionDto,
): Promise<QuizAuthorQuestionDto> {
  const sdk = getQuizzes();

  // Map our DTO to the SDK's CreateQuizQuestionDto
  const sdkPayload = {
    position: payload.position,
    questionText: payload.questionText,
    imageUrl: payload.imageUrl,
    answerOptions: payload.answerOptions.map((opt) => opt as unknown as CreateQuizAnswerOptionDto),
  } as unknown as CreateQuizQuestionDto;

  const response = await sdk.quizControllerCreateQuizQuestion(quizId, versionId, sdkPayload);

  // Unwrap the WrappedDto envelope: { data: QuizQuestionAuthorDto, meta: … }
  const data = (response as unknown as { data?: QuizAuthorQuestionDto }).data;
  if (!data) {
    throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions');
  }

  return data;
}

/**
 * Bulk create questions for a quiz version.
 *
 * @param quizId - Quiz UUID
 * @param versionId - Quiz version UUID
 * @param payload - Bulk question creation payload (1–50 questions)
 * @returns Bulk result with per-item status
 */
export async function bulkCreateVersionQuestions(
  quizId: string,
  versionId: string,
  payload: BulkCreateQuestionsDto,
): Promise<BulkQuestionsResultDto> {
  const sdk = getQuizzes();

  // Map our DTO to the SDK's CreateQuizQuestionsDto
  const sdkPayload = {
    questions: payload.questions.map((q) => ({
      position: q.position,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      answerOptions: q.answerOptions.map((opt) => opt as unknown as CreateQuizAnswerOptionDto),
    })),
  } as unknown as CreateQuizQuestionsDto;

  const response = await sdk.quizControllerCreateQuizQuestions(quizId, versionId, sdkPayload);

  // Unwrap the WrappedDto envelope
  const data = (response as unknown as { data?: BulkQuizQuestionsResponseDto }).data;
  if (!data) {
    throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/questions/bulk');
  }

  const createdQuestions = data.questions ?? [];

  // Phase 5 (S-28): the backend now returns `results[]` carrying
  // per-row success/failure. Forward it as-is. For older SDK
  // versions where the field is absent, fall back to building a
  // best-effort success-only results array from `questions`.
  const results: BulkQuestionsResultDto['results'] = data.results
    ? data.results.map((r) => ({
        index: r.index,
        status: r.status,
        code: r.code ?? '',
        message: r.message ?? '',
        questionId:
          typeof r.questionId === 'string' ? r.questionId : undefined,
      }))
    : createdQuestions.map((q, i) => ({
        index: i,
        status: 201,
        code: '',
        message: '',
        questionId: q.questionId,
      }));

  return {
    questions: createdQuestions as unknown as QuizAuthorQuestionDto[],
    results,
  };
}
