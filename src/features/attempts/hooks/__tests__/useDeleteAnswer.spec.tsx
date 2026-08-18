

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
useAttemptsStore,
hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';

const withdrawAnswerMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());
const broadcastAttemptsChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
withdrawAnswer: withdrawAnswerMock,
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

import { useDeleteAnswer } from '@/features/attempts/hooks/useDeleteAnswer';

const SESSION_ID = 'user-1';
const ATTEMPT_ID = 'attempt-1';
const QV_ID = 'qv-1';
const QUESTION_ID = 'q1';

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
withdrawAnswerMock.mockResolvedValue({});
useAttemptsStore.setState(
{ attemptsById: {}, attemptsByQuizVersionId: {} },
true,
  );
});

afterEach(() => {
vi.useRealTimers();
});

describe('useDeleteAnswer — auth gate', () => {
it('returns idle when attemptId is null', async () => {
setBootstrapAuthenticated();
const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: null, quizVersionId: QV_ID }),
    );
let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });
expect(outcome.kind).toBe('idle');
expect(withdrawAnswerMock).not.toHaveBeenCalled();
  });
});

describe('useDeleteAnswer — happy path', () => {
it('forwards verified attemptId and questionId', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

await act(async () => {
await result.current.withdraw(QUESTION_ID);
    });

expect(withdrawAnswerMock).toHaveBeenCalledTimes(1);
expect(withdrawAnswerMock).toHaveBeenCalledWith(ATTEMPT_ID, QUESTION_ID);
  });

it('revalidates the answers cache and emits one broadcast', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

await act(async () => {
await result.current.withdraw(QUESTION_ID);
    });

expect(mutateMock).toHaveBeenCalledWith(
ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
expect(broadcastAttemptsChangedMock).toHaveBeenCalledWith({
userId: SESSION_ID,
attemptId: ATTEMPT_ID,
kind: 'withdraw',
    });
  });
});

describe('useDeleteAnswer — 404 answer_not_found', () => {
it('produces already_missing silently and clears the lock', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
withdrawAnswerMock.mockRejectedValueOnce(
makeApiError(404, 'ATTEMPT_ANSWER_NOT_FOUND'),
    );

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });

expect(outcome.kind).toBe('already_missing');
expect(result.current.error).toBeNull();
expect(mutateMock).toHaveBeenCalledWith(
ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
  });
});

describe('useDeleteAnswer — 404 attempt_not_found', () => {
it('produces not_found', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
withdrawAnswerMock.mockRejectedValueOnce(
makeApiError(404, 'ATTEMPT_NOT_FOUND'),
    );

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });

expect(outcome.kind).toBe('not_found');
  });
});

describe('useDeleteAnswer — 409 not_active', () => {
it('produces not_active', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
withdrawAnswerMock.mockRejectedValueOnce(
makeApiError(409, 'ATTEMPT_NOT_ACTIVE'),
    );

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });

expect(outcome.kind).toBe('not_active');
  });
});

describe('useDeleteAnswer — 403 forbidden', () => {
it('produces forbidden', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
withdrawAnswerMock.mockRejectedValueOnce(
makeApiError(403, 'ATTEMPT_FORBIDDEN'),
    );

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });

expect(outcome.kind).toBe('forbidden');
  });
});

describe('useDeleteAnswer — retryable', () => {
it('surfaces 5xx as retryable with typed error', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
withdrawAnswerMock.mockRejectedValueOnce(makeApiError(500, 'INTERNAL'));

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
outcome = await result.current.withdraw(QUESTION_ID);
    });

expect(outcome.kind).toBe('retryable');
if (outcome.kind === 'retryable') {
expect(outcome.error.status).toBe(500);
    }
  });
});

describe('useDeleteAnswer — cooldown', () => {
it('drops a rapid duplicate click', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useDeleteAnswer({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let first!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
first = await result.current.withdraw(QUESTION_ID);
    });

let second!: Awaited<ReturnType<typeof result.current.withdraw>>;
await act(async () => {
second = await result.current.withdraw(QUESTION_ID);
    });

expect(first.kind).toBe('success');
expect(second.kind).toBe('cooldown');
expect(withdrawAnswerMock).toHaveBeenCalledTimes(1);
  });
});