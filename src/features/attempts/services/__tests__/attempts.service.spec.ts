/**
 * `attempts.service.spec.ts` — locks the attempts service contract.
 *
 * Source epic:   Epic 4.1.
 * Source tickets: TKT-4.1.F7, TKT-4.1.F5.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.1.
 *
 * Coverage:
 *
 *   - Pass-through + ATTEMPT_* error codes from the F5/F7 tickets.
 *   - The Story 4.14 active-attempt lookup (T-4.14.1) normalises
 *     the empty page and 404 to `null` and propagates 401/403/429/5xx.
 *   - The Story 4.14 hydration answers read (T-4.14.1) returns the
 *     canonical `AttemptAnswersResponseDto` projection.
 *   - The Story 4.14 typed result aliases (`AttemptDto`,
 *     `AttemptAnswersDto`, `SubmitAnswerResultDto`,
 *     `WithdrawAnswerResultDto`, `AbandonAttemptDto`) are exported
 *     and the helper signatures accept them.
 *   - The Story 4.15 complete-attempt envelope unwrap (T-4.15.1)
 *     resolves the verified `CompleteAttemptResponseDto` projection
 *     and surfaces typed errors.
 *   - The Story 4.15 attempt-result read (T-4.15.1) normalises the
 *     empty page and 404 to `null` and propagates 401/403/429/5xx.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
  abandonAttempt,
  completeAttempt,
  getActiveAttempt,
  getAttempt,
  getAttemptAnswers,
  getAttemptResult,
  startAttempt,
  submitAnswer,
  withdrawAnswer,
} from '@/features/attempts/services/attempts.service';

const attemptControllerStartAttemptMock = vi.fn();
const attemptControllerSubmitAnswerMock = vi.fn();
const attemptControllerWithdrawAnswerMock = vi.fn();
const attemptControllerCompleteAttemptMock = vi.fn();
const attemptControllerAbandonAttemptMock = vi.fn();
const attemptControllerGetAttemptByIdMock = vi.fn();
const attemptControllerGetAttemptAnswersMock = vi.fn();
const attemptControllerGetAttemptReviewMock = vi.fn();
const attemptControllerListMyAttemptsMock = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getAttempts: () => ({
      attemptControllerStartAttempt: attemptControllerStartAttemptMock,
      attemptControllerSubmitAnswer: attemptControllerSubmitAnswerMock,
      attemptControllerWithdrawAnswer: attemptControllerWithdrawAnswerMock,
      attemptControllerCompleteAttempt: attemptControllerCompleteAttemptMock,
      attemptControllerAbandonAttempt: attemptControllerAbandonAttemptMock,
      attemptControllerGetAttemptById: attemptControllerGetAttemptByIdMock,
      attemptControllerGetAttemptAnswers:
        attemptControllerGetAttemptAnswersMock,
      attemptControllerGetAttemptReview:
        attemptControllerGetAttemptReviewMock,
      attemptControllerListMyAttempts: attemptControllerListMyAttemptsMock,
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeApiError(status: number, code: string, message: string): ApiError {
  return new ApiError({
    name: 'AxiosError',
    message,
    isAxiosError: true,
    response: {
      status,
      statusText: 'X',
      data: {
        type: 'https://api.quiz.local/problems/x',
        title: 'X',
        status,
        detail: message,
        instance: '/api/v1/x',
        extensions: { code, requestId: 'req-test' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('attempts.service — pass-through', () => {
  it('startAttempt forwards quizId and payload', async () => {
    attemptControllerStartAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      quizId: 'q1',
    });

    const result = await startAttempt('q1', {} as Parameters<typeof startAttempt>[1]);

    expect(attemptControllerStartAttemptMock).toHaveBeenCalledTimes(1);
    expect(attemptControllerStartAttemptMock).toHaveBeenCalledWith('q1', {});
    expect(result).toMatchObject({ attemptId: 'a1' });
  });

  it('completeAttempt forwards attemptId and unwraps the completed projection', async () => {
    const completedDto = {
      attemptId: 'a1',
      quizId: 'q1',
      status: 'completed',
      scorePercent: 80,
      correctCount: 4,
      timeTakenMs: 12_345,
      xpEarned: 25,
      finishedAt: '2026-08-01T00:00:00.000Z',
    };
    attemptControllerCompleteAttemptMock.mockResolvedValue({
      data: completedDto,
    });

    const result = await completeAttempt('a1');

    expect(attemptControllerCompleteAttemptMock).toHaveBeenCalledTimes(1);
    expect(attemptControllerCompleteAttemptMock).toHaveBeenCalledWith('a1');
    expect(result).toEqual(completedDto);
    // Runtime contract: hooks read the canonical projection directly,
    // never inspect the `{ data: … }` envelope.
    expect((result as unknown as { data?: unknown }).data).toBeUndefined();
  });

  it('completeAttempt surfaces 403 ATTEMPT_NOT_ACTIVE', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_NOT_ACTIVE', 'no longer active'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_NOT_ACTIVE',
      status: 403,
    });
  });

  it('completeAttempt surfaces 404 ATTEMPT_NOT_FOUND', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(404, 'ATTEMPT_NOT_FOUND', 'missing'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_NOT_FOUND',
      status: 404,
    });
  });

  it('completeAttempt surfaces 403 ATTEMPT_FORBIDDEN', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_FORBIDDEN', 'cross-user'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_FORBIDDEN',
      status: 403,
    });
  });

  it('completeAttempt surfaces 422 ATTEMPT_VALIDATION_FAILED', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(422, 'ATTEMPT_VALIDATION_FAILED', 'no answers'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_VALIDATION_FAILED',
      status: 422,
    });
  });

  it('completeAttempt surfaces 429 as a typed ApiError', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'GLOBAL_RATE_LIMITED',
      status: 429,
    });
  });

  it('completeAttempt surfaces 5xx as a typed ApiError', async () => {
    attemptControllerCompleteAttemptMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'oops'),
    );

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
    });
  });

  it('completeAttempt throws a typed ApiError when the envelope has no data field', async () => {
    attemptControllerCompleteAttemptMock.mockResolvedValue({});

    await expect(completeAttempt('a1')).rejects.toMatchObject({
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
    });
  });

  it('getAttempt forwards attemptId and returns the canonical projection', async () => {
    attemptControllerGetAttemptByIdMock.mockResolvedValue({
      data: { attemptId: 'a1', status: 'started' },
    });

    const result = await getAttempt('a1');

    expect(attemptControllerGetAttemptByIdMock).toHaveBeenCalledWith('a1');
    expect(result).toMatchObject({ data: { attemptId: 'a1' } });
  });

  it('getAttemptAnswers forwards attemptId and returns the canonical projection', async () => {
    attemptControllerGetAttemptAnswersMock.mockResolvedValue({
      data: {
        attemptId: 'a1',
        answers: [{ questionId: 'q1', selectedOptionId: 'o1', submittedAt: '2026-08-01T00:00:00.000Z' }],
      },
    });

    const result = await getAttemptAnswers('a1');

    expect(attemptControllerGetAttemptAnswersMock).toHaveBeenCalledWith('a1');
    expect(result.data?.answers[0]?.questionId).toBe('q1');
  });
});

describe('attempts.service — ApiError code exposure', () => {
  it('startAttempt surfaces 409 ATTEMPT_ALREADY_STARTED', async () => {
    attemptControllerStartAttemptMock.mockRejectedValue(
      makeApiError(409, 'ATTEMPT_ALREADY_STARTED', 'already in progress'),
    );

    await expect(
      startAttempt('q1', {} as Parameters<typeof startAttempt>[1]),
    ).rejects.toMatchObject({
      code: 'ATTEMPT_ALREADY_STARTED',
      status: 409,
    });
  });

  it('startAttempt surfaces 422 ATTEMPT_QUIZ_NOT_PUBLISHED', async () => {
    attemptControllerStartAttemptMock.mockRejectedValue(
      makeApiError(422, 'ATTEMPT_QUIZ_NOT_PUBLISHED', 'not published'),
    );

    await expect(
      startAttempt('q1', {} as Parameters<typeof startAttempt>[1]),
    ).rejects.toMatchObject({
      code: 'ATTEMPT_QUIZ_NOT_PUBLISHED',
      status: 422,
    });
  });

  it('submitAnswer surfaces 409 ATTEMPT_QUESTION_ALREADY_ANSWERED', async () => {
    attemptControllerSubmitAnswerMock.mockRejectedValue(
      makeApiError(409, 'ATTEMPT_QUESTION_ALREADY_ANSWERED', 'already answered'),
    );

    await expect(
      submitAnswer('a1', {} as Parameters<typeof submitAnswer>[1]),
    ).rejects.toMatchObject({
      code: 'ATTEMPT_QUESTION_ALREADY_ANSWERED',
      status: 409,
    });
  });

  it('submitAnswer surfaces 422 ATTEMPT_VALIDATION_FAILED', async () => {
    attemptControllerSubmitAnswerMock.mockRejectedValue(
      makeApiError(422, 'ATTEMPT_VALIDATION_FAILED', 'invalid payload'),
    );

    await expect(
      submitAnswer('a1', {} as Parameters<typeof submitAnswer>[1]),
    ).rejects.toMatchObject({
      code: 'ATTEMPT_VALIDATION_FAILED',
      status: 422,
    });
  });

  it('submitAnswer surfaces 400 ATTEMPT_NOT_ACTIVE', async () => {
    attemptControllerSubmitAnswerMock.mockRejectedValue(
      makeApiError(400, 'ATTEMPT_NOT_ACTIVE', 'no longer active'),
    );

    await expect(
      submitAnswer('a1', {} as Parameters<typeof submitAnswer>[1]),
    ).rejects.toMatchObject({
      code: 'ATTEMPT_NOT_ACTIVE',
      status: 400,
    });
  });

  it('withdrawAnswer surfaces 404 ATTEMPT_ANSWER_NOT_FOUND', async () => {
    attemptControllerWithdrawAnswerMock.mockRejectedValue(
      makeApiError(404, 'ATTEMPT_ANSWER_NOT_FOUND', 'no answer'),
    );

    await expect(withdrawAnswer('a1', 'q999')).rejects.toMatchObject({
      code: 'ATTEMPT_ANSWER_NOT_FOUND',
      status: 404,
    });
  });

  it('withdrawAnswer surfaces 400 ATTEMPT_QUESTION_INVALID', async () => {
    attemptControllerWithdrawAnswerMock.mockRejectedValue(
      makeApiError(400, 'ATTEMPT_QUESTION_INVALID', 'invalid question'),
    );

    await expect(withdrawAnswer('a1', 'q999')).rejects.toMatchObject({
      code: 'ATTEMPT_QUESTION_INVALID',
      status: 400,
    });
  });

  it('abandonAttempt surfaces 409 ATTEMPT_NOT_ACTIVE', async () => {
    attemptControllerAbandonAttemptMock.mockRejectedValue(
      makeApiError(409, 'ATTEMPT_NOT_ACTIVE', 'no longer active'),
    );

    await expect(abandonAttempt('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_NOT_ACTIVE',
      status: 409,
    });
  });
});

describe('attempts.service — getActiveAttempt (T-4.14.1)', () => {
  it('forwards quizId + status=started + limit=1 to listMyAttempts', async () => {
    attemptControllerListMyAttemptsMock.mockResolvedValue({ data: [] });

    await getActiveAttempt('q1');

    expect(attemptControllerListMyAttemptsMock).toHaveBeenCalledTimes(1);
    expect(attemptControllerListMyAttemptsMock).toHaveBeenCalledWith({
      quizId: 'q1',
      status: 'started',
      limit: 1,
    });
  });

  it('resolves to the first item when the list returns one summary', async () => {
    const summary = { attemptId: 'a1', quizId: 'q1', status: 'started' };
    attemptControllerListMyAttemptsMock.mockResolvedValue({ data: [summary] });

    await expect(getActiveAttempt('q1')).resolves.toEqual(summary);
  });

  it('resolves to null when the page is empty', async () => {
    attemptControllerListMyAttemptsMock.mockResolvedValue({ data: [] });

    await expect(getActiveAttempt('q1')).resolves.toBeNull();
  });

  it('resolves to null when the envelope has no data field', async () => {
    attemptControllerListMyAttemptsMock.mockResolvedValue({});

    await expect(getActiveAttempt('q1')).resolves.toBeNull();
  });

  it('resolves to null when the service returns 404', async () => {
    attemptControllerListMyAttemptsMock.mockRejectedValue(
      makeApiError(404, 'GLOBAL_NOT_FOUND', 'no attempts'),
    );

    await expect(getActiveAttempt('q1')).resolves.toBeNull();
  });

  it('propagates 401 as a typed ApiError (not as null)', async () => {
    attemptControllerListMyAttemptsMock.mockRejectedValue(
      makeApiError(401, 'GLOBAL_UNAUTHENTICATED', 'expired'),
    );

    await expect(getActiveAttempt('q1')).rejects.toMatchObject({
      code: 'GLOBAL_UNAUTHENTICATED',
      status: 401,
    });
  });

  it('propagates 403 as a typed ApiError', async () => {
    attemptControllerListMyAttemptsMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_FORBIDDEN', 'cross-user'),
    );

    await expect(getActiveAttempt('q1')).rejects.toMatchObject({
      code: 'ATTEMPT_FORBIDDEN',
      status: 403,
    });
  });

  it('propagates 429 as a typed ApiError', async () => {
    attemptControllerListMyAttemptsMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );

    await expect(getActiveAttempt('q1')).rejects.toMatchObject({
      code: 'GLOBAL_RATE_LIMITED',
      status: 429,
    });
  });

  it('propagates 5xx as a typed ApiError', async () => {
    attemptControllerListMyAttemptsMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'oops'),
    );

    await expect(getActiveAttempt('q1')).rejects.toMatchObject({
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
    });
  });
});

describe('attempts.service — getAttemptResult (T-4.15.1)', () => {
  it('forwards attemptId to the reviewer SDK operation', async () => {
    attemptControllerGetAttemptReviewMock.mockResolvedValue({ data: null });

    await getAttemptResult('a1');

    expect(attemptControllerGetAttemptReviewMock).toHaveBeenCalledTimes(1);
    expect(attemptControllerGetAttemptReviewMock).toHaveBeenCalledWith('a1');
  });

  it('resolves to the canonical reviewer projection on 200', async () => {
    const review = {
      attemptId: 'a1',
      quizId: 'q1',
      totalQuestions: 5,
      correctCount: 4,
      scorePercent: 80,
      questionScores: [],
    };
    attemptControllerGetAttemptReviewMock.mockResolvedValue({ data: review });

    await expect(getAttemptResult('a1')).resolves.toEqual(review);
  });

  it('resolves to null when the envelope has no data field', async () => {
    attemptControllerGetAttemptReviewMock.mockResolvedValue({});

    await expect(getAttemptResult('a1')).resolves.toBeNull();
  });

  it('resolves to null when the service returns 404 (no completed review yet)', async () => {
    attemptControllerGetAttemptReviewMock.mockRejectedValue(
      makeApiError(404, 'GLOBAL_NOT_FOUND', 'no review'),
    );

    await expect(getAttemptResult('a1')).resolves.toBeNull();
  });

  it('propagates 401 as a typed ApiError (not as null)', async () => {
    attemptControllerGetAttemptReviewMock.mockRejectedValue(
      makeApiError(401, 'GLOBAL_UNAUTHENTICATED', 'expired'),
    );

    await expect(getAttemptResult('a1')).rejects.toMatchObject({
      code: 'GLOBAL_UNAUTHENTICATED',
      status: 401,
    });
  });

  it('propagates 403 ATTEMPT_FORBIDDEN as a typed ApiError', async () => {
    attemptControllerGetAttemptReviewMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_FORBIDDEN', 'cross-user'),
    );

    await expect(getAttemptResult('a1')).rejects.toMatchObject({
      code: 'ATTEMPT_FORBIDDEN',
      status: 403,
    });
  });

  it('propagates 429 as a typed ApiError', async () => {
    attemptControllerGetAttemptReviewMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );

    await expect(getAttemptResult('a1')).rejects.toMatchObject({
      code: 'GLOBAL_RATE_LIMITED',
      status: 429,
    });
  });

  it('propagates 5xx as a typed ApiError', async () => {
    attemptControllerGetAttemptReviewMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'oops'),
    );

    await expect(getAttemptResult('a1')).rejects.toMatchObject({
      code: 'GLOBAL_INTERNAL_ERROR',
      status: 500,
    });
  });
});