/**
 * `quizzes.service.spec.ts` — locks the quizzes service contract.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.F7.
 *
 * Four cases per the F7 acceptance criterion 1, adapted for the
 * quizzes service:
 *
 *   (a) the function returns the unwrapped SDK entity (pass-through)
 *   (b) a 4xx from the SDK surfaces as an `ApiError` whose
 *       `.code` is one of the 132 `ErrorCode` members
 *   (c) the bulk-create function returns the per-item result shape
 *       (the SDK returns the per-item result envelope; the service
 *       passes it through unchanged)
 *
 * No Sentry-breadcrumb assertion — see F7 ticket body §"Sentry
 * breadcrumb is called"; the service is a thin pass-through and
 * does NOT add telemetry. Telemetry is owned by the per-feature
 * mutation hooks.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
  bulkCreateQuizQuestions,
  createQuiz,
  deleteQuiz,
  publishQuizVersion,
} from '@/features/quizzes/services/quizzes.service';

const quizControllerCreateQuizMock = vi.fn();
const quizControllerDeleteQuizMock = vi.fn();
const quizControllerPublishQuizVersionMock = vi.fn();
const quizControllerCreateQuizQuestionsMock = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getQuizzes: () => ({
      quizControllerCreateQuiz: quizControllerCreateQuizMock,
      quizControllerDeleteQuiz: quizControllerDeleteQuizMock,
      quizControllerPublishQuizVersion: quizControllerPublishQuizVersionMock,
      quizControllerCreateQuizQuestions: quizControllerCreateQuizQuestionsMock,
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── (a) pass-through ────────────────────────────────────────────────────

describe('quizzes.service — pass-through', () => {
  it('createQuiz forwards the payload and returns the SDK result', async () => {
    const expected = {
      id: 'q1',
      slug: 'my-quiz',
      title: 'My Quiz',
    };
    quizControllerCreateQuizMock.mockResolvedValue(expected);

    const result = await createQuiz({
      title: 'My Quiz',
      slug: 'my-quiz',
    } as Parameters<typeof createQuiz>[0]);

    expect(quizControllerCreateQuizMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(expected);
  });
});

// ─── (b) ApiError propagation ───────────────────────────────────────────

describe('quizzes.service — ApiError propagation', () => {
  it('deleteQuiz propagates a 404 QUIZ_NOT_FOUND as ApiError', async () => {
    const apiError = new ApiError({
      name: 'AxiosError',
      message: 'Quiz not found',
      isAxiosError: true,
      response: {
        status: 404,
        statusText: 'Not Found',
        data: {
          type: 'https://api.quiz.local/problems/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Quiz not found',
          instance: '/api/v1/quizzes/missing',
          extensions: {
            code: 'QUIZ_NOT_FOUND',
            requestId: 'req-test',
          },
        },
        headers: {},
        config: undefined as never,
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    quizControllerDeleteQuizMock.mockRejectedValue(apiError);

    await expect(deleteQuiz('missing-id')).rejects.toBe(apiError);
    await expect(deleteQuiz('missing-id')).rejects.toMatchObject({
      code: 'QUIZ_NOT_FOUND',
      status: 404,
    });
  });

  it('publishQuizVersion propagates a 409 QUIZ_VERSION_IMMUTABLE as ApiError', async () => {
    const apiError = new ApiError({
      name: 'AxiosError',
      message: 'Version is immutable',
      isAxiosError: true,
      response: {
        status: 409,
        statusText: 'Conflict',
        data: {
          type: 'https://api.quiz.local/problems/conflict',
          title: 'Conflict',
          status: 409,
          detail: 'Version is immutable',
          instance: '/api/v1/quizzes/q1/versions/v1/publish',
          extensions: {
            code: 'QUIZ_VERSION_IMMUTABLE',
            requestId: 'req-test',
          },
        },
        headers: {},
        config: undefined as never,
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    quizControllerPublishQuizVersionMock.mockRejectedValue(apiError);

    await expect(publishQuizVersion('q1', 'v1')).rejects.toMatchObject({
      code: 'QUIZ_VERSION_IMMUTABLE',
      status: 409,
    });
  });
});

// ─── (c) bulk-create per-item shape ─────────────────────────────────────

describe('quizzes.service — bulk create per-item shape', () => {
  it('bulkCreateQuizQuestions returns the SDK per-item envelope', async () => {
    // The SDK's bulk-create endpoint returns
    // `WrappedDto & { data?: { questions: QuizQuestionAuthorDto[] } }`.
    // The wire shape is a flat array of created questions (the
    // backend processes all-or-nothing for quiz authoring — there is
    // no per-item failure envelope on this endpoint). The per-item
    // { ok, results[] } shape only applies to bookmarks bulk endpoints
    // (see bookmarks.service.spec.ts).
    const expected = {
      data: {
        questions: [
          { id: 'q1', position: 0, prompt: 'Q1', type: 'single_choice' },
          { id: 'q2', position: 1, prompt: 'Q2', type: 'multiple_choice' },
        ],
      },
    };
    quizControllerCreateQuizQuestionsMock.mockResolvedValue(expected);

    const result = await bulkCreateQuizQuestions('q1', 'v1', {
      questions: [],
    } as unknown as Parameters<typeof bulkCreateQuizQuestions>[2]);

    expect(quizControllerCreateQuizQuestionsMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(expected);
    // The bulk-quiz wire shape contract:
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data?.questions)).toBe(true);
    expect(result.data?.questions).toHaveLength(2);
  });
});