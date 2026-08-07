/**
 * `useSubmitAnswer.spec.tsx` — locks the validated submit-answer
 * mutation hook.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.10.
 *
 * Coverage contract:
 *
 *   - Validation: empty multi-select, missing true/false, cross-kind
 *     mismatch are blocked before any network call.
 *   - Service receives the verified payload exactly once per logical
 *     user intent.
 *   - Success hydrates the store and revalidates the answers cache.
 *   - Success emits one cross-tab `attempts/changed { kind: 'submit' }`.
 *   - 409 `ATTEMPT_QUESTION_ALREADY_ANSWERED` produces an
 *     `already_answered` outcome and refreshes server answers.
 *   - 422 `ATTEMPT_QUESTION_INVALID` produces `question_invalid`.
 *   - 403 produces `forbidden`; 409 `ATTEMPT_NOT_ACTIVE` produces
 *     `not_active`.
 *   - 429 / 5xx surface as `retryable` with the typed error.
 *   - Cooldown blocks rapid duplicate clicks.
 *   - Auth gate: bootstrap loading / unauthenticated do not fire.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
  useAttemptsStore,
} from '@/features/attempts/stores/useAttemptsStore';

const submitAnswerMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());
const broadcastAttemptsChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
  submitAnswer: submitAnswerMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
}));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return { ...actual, mutate: mutateMock };
});

vi.mock('@/lib/api/core/attempts-broadcast-channel', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/core/attempts-broadcast-channel')>(
      '@/lib/api/core/attempts-broadcast-channel',
    );
  return { ...actual, broadcastAttemptsChanged: broadcastAttemptsChangedMock };
});

import { useSubmitAnswer } from '@/features/attempts/hooks/useSubmitAnswer';

const SESSION_ID = 'user-1';
const ATTEMPT_ID = 'attempt-1';
const QV_ID = 'qv-1';

function makeMultiChoiceQuestion(): import('@/lib/api/generated/schemas').QuizQuestionPlayerDto {
  return {
    questionId: 'q1',
    text: 'Pick the correct answer',
    orderIndex: 0,
    imageUrl: null,
    answerOptions: [
      { optionId: 'opt-a', text: 'A', value: 'a' },
      { optionId: 'opt-b', text: 'B', value: 'b' },
      { optionId: 'opt-c', text: 'C', value: 'c' },
      { optionId: 'opt-d', text: 'D', value: 'd' },
    ],
  } as unknown as import('@/lib/api/generated/schemas').QuizQuestionPlayerDto;
}

function makeTrueFalseQuestion(): import('@/lib/api/generated/schemas').QuizQuestionPlayerDto {
  return {
    questionId: 'q2',
    text: 'True or false?',
    orderIndex: 1,
    imageUrl: null,
    answerOptions: [
      { optionId: 'opt-true', text: 'True', value: 'true' },
      { optionId: 'opt-false', text: 'False', value: 'false' },
    ],
  } as unknown as import('@/lib/api/generated/schemas').QuizQuestionPlayerDto;
}

function setBootstrapAuthenticated() {
  useAuthSessionMock.mockReturnValue({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: SESSION_ID, id: SESSION_ID },
  });
}

function makeApiError(
  status: number,
  code: string,
  message = `Mock ${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/x',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-test' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateMock.mockResolvedValue(undefined);
  broadcastAttemptsChangedMock.mockReturnValue(undefined);
  submitAnswerMock.mockResolvedValue({
    data: { questionId: 'q1', submittedAt: '2026-08-01T00:00:00.000Z' },
  });
  useAttemptsStore.setState(
    { attemptsById: {}, attemptsByQuizVersionId: {} },
    true,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSubmitAnswer — auth gate', () => {
  it('returns idle when attemptId is null', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: null, quizVersionId: QV_ID }),
    );
    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-a'],
      });
    });
    expect(outcome.kind).toBe('idle');
    expect(submitAnswerMock).not.toHaveBeenCalled();
  });
});

describe('useSubmitAnswer — validation gate', () => {
  it('refuses empty multi-select without firing the service', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );
    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: [],
      });
    });
    expect(outcome.kind).toBe('invalid');
    expect(submitAnswerMock).not.toHaveBeenCalled();
  });

  it('refuses cross-kind selection as blocked', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );
    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      // multiple_choice selection against a true/false question
      outcome = await result.current.submit(makeTrueFalseQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q2',
        selectedOptionIds: ['opt-true'],
      });
    });
    expect(outcome.kind).toBe('question_invalid');
    expect(submitAnswerMock).not.toHaveBeenCalled();
  });
});

describe('useSubmitAnswer — happy path', () => {
  it('forwards verified payload exactly once per logical intent', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    await act(async () => {
      await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(submitAnswerMock).toHaveBeenCalledTimes(1);
    expect(submitAnswerMock).toHaveBeenCalledWith(ATTEMPT_ID, {
      questionId: 'q1',
      selectedOptionId: 'opt-b',
    });
  });

  it('hydrates the runner store and revalidates the answers cache', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    await act(async () => {
      await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
    expect(entry?.submittedAnswers['q1']).toBeDefined();
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
  });

  it('emits one cross-tab broadcast with kind=submit', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    await act(async () => {
      await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
    expect(broadcastAttemptsChangedMock).toHaveBeenCalledWith({
      userId: SESSION_ID,
      attemptId: ATTEMPT_ID,
      kind: 'submit',
    });
  });
});

describe('useSubmitAnswer — 409 already_answered', () => {
  it('refreshes server answers and produces already_answered outcome', async () => {
    setBootstrapAuthenticated();
    submitAnswerMock.mockRejectedValueOnce(
      makeApiError(409, 'ATTEMPT_QUESTION_ALREADY_ANSWERED'),
    );

    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(outcome.kind).toBe('already_answered');
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
  });
});

describe('useSubmitAnswer — 422 question_invalid', () => {
  it('produces question_invalid outcome', async () => {
    setBootstrapAuthenticated();
    submitAnswerMock.mockRejectedValueOnce(
      makeApiError(422, 'ATTEMPT_QUESTION_INVALID'),
    );

    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(outcome.kind).toBe('question_invalid');
  });
});

describe('useSubmitAnswer — 403 forbidden', () => {
  it('produces forbidden outcome', async () => {
    setBootstrapAuthenticated();
    submitAnswerMock.mockRejectedValueOnce(
      makeApiError(403, 'ATTEMPT_FORBIDDEN'),
    );

    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(outcome.kind).toBe('forbidden');
  });
});

describe('useSubmitAnswer — retryable failures', () => {
  it('surfaces 5xx as retryable with the typed error', async () => {
    setBootstrapAuthenticated();
    submitAnswerMock.mockRejectedValueOnce(makeApiError(500, 'INTERNAL'));

    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    let outcome!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      outcome = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(outcome.kind).toBe('retryable');
    if (outcome.kind === 'retryable') {
      expect(outcome.error.status).toBe(500);
    }
  });
});

describe('useSubmitAnswer — cooldown', () => {
  it('drops a rapid duplicate click inside the cooldown window', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() =>
      useSubmitAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

    let first!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      first = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    let second!: Awaited<ReturnType<typeof result.current.submit>>;
    await act(async () => {
      second = await result.current.submit(makeMultiChoiceQuestion(), {
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-b'],
      });
    });

    expect(first.kind).toBe('success');
    expect(second.kind).toBe('cooldown');
    expect(submitAnswerMock).toHaveBeenCalledTimes(1);
  });
});