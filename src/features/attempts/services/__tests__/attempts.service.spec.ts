/**
 * `attempts.service.spec.ts` — locks the attempts service contract.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.F7.
 *
 * Coverage: pass-through + the ATTEMPT_* error codes the F5 ticket
 * calls out (`ATTEMPT_ALREADY_STARTED`, `ATTEMPT_NOT_ACTIVE`,
 * `ATTEMPT_QUIZ_NOT_PUBLISHED`, `ATTEMPT_QUESTION_INVALID`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
  completeAttempt,
  startAttempt,
  submitAnswer,
  withdrawAnswer,
} from '@/features/attempts/services/attempts.service';

const attemptControllerStartAttemptMock = vi.fn();
const attemptControllerSubmitAnswerMock = vi.fn();
const attemptControllerWithdrawAnswerMock = vi.fn();
const attemptControllerCompleteAttemptMock = vi.fn();

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

  it('completeAttempt forwards attemptId', async () => {
    attemptControllerCompleteAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      status: 'completed',
    });

    const result = await completeAttempt('a1');

    expect(attemptControllerCompleteAttemptMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'completed' });
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

  it('withdrawAnswer surfaces 400 ATTEMPT_QUESTION_INVALID', async () => {
    attemptControllerWithdrawAnswerMock.mockRejectedValue(
      makeApiError(400, 'ATTEMPT_QUESTION_INVALID', 'invalid question'),
    );

    await expect(withdrawAnswer('a1', 'q999')).rejects.toMatchObject({
      code: 'ATTEMPT_QUESTION_INVALID',
      status: 400,
    });
  });
});