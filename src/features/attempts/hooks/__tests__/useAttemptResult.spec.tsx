

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import {
getAttemptResult,
} from '@/features/attempts/services/attempts.service';

import { useAttemptResult } from '../useAttemptResult';

const getAttemptResultMock = vi.fn();
const completeAttemptService = vi.fn();

vi.mock('@/features/attempts/services/attempts.service', async () => {
const actual =
await vi.importActual<
typeof import('@/features/attempts/services/attempts.service')
    >('@/features/attempts/services/attempts.service');
return {
...actual,
getAttemptResult: (...args: unknown[]) => getAttemptResultMock(...args),
completeAttempt: (...args: unknown[]) =>
completeAttemptService(...args),
  };
});

const useAuthSessionMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: () => useAuthSessionMock(),
}));

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

function authedAs(userId: string): void {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
currentUser: { id: userId, userId },
  });
}

function unauthed(): void {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'unauthenticated',
currentUser: null,
  });
}

function loading(): void {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'loading',
currentUser: null,
  });
}

const stubReview = {
attemptId: 'a1',
quizId: 'q1',
quizTitle: 'Quiz',
quizSlug: 'quiz',
versionNumber: 1,
difficulty: 'medium',
passingScorePercent: 60,
scorePercent: 80,
correctCount: 4,
totalQuestions: 5,
xpEarned: 25,
finishedAt: '2026-08-01T00:00:00.000Z',
status: 'completed',
questions: [],
};

describe('useAttemptResult — auth gating', () => {
it('does not fire a request when auth is unresolved', async () => {
loading();
const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

expect(result.current.result).toBeNull();
expect(result.current.isLoading).toBe(false);
expect(result.current.hasResolved).toBe(false);
expect(getAttemptResultMock).not.toHaveBeenCalled();
  });

it('does not fire a request when the viewer is unauthenticated', async () => {
unauthed();
const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

expect(result.current.result).toBeNull();
expect(result.current.error).toBeNull();
expect(getAttemptResultMock).not.toHaveBeenCalled();
  });

it('does not fire a request when attemptId is null', async () => {
authedAs('user-1');
const { result } = renderHook(() =>
useAttemptResult({ attemptId: null }),
    );

expect(result.current.result).toBeNull();
expect(result.current.error).toBeNull();
expect(getAttemptResultMock).not.toHaveBeenCalled();
  });
});

describe('useAttemptResult — success', () => {
beforeEach(() => {
authedAs('user-1');
  });

it('returns the canonical review projection on 200', async () => {
getAttemptResultMock.mockResolvedValue(stubReview);

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.result).toEqual(stubReview);
    });
expect(result.current.error).toBeNull();
  });

it('forwards the verified attempt id to the service', async () => {
getAttemptResultMock.mockResolvedValue(stubReview);

renderHook(() => useAttemptResult({ attemptId: 'a-uuid' }));

await waitFor(() => {
expect(getAttemptResultMock).toHaveBeenCalledWith('a-uuid');
    });
  });

it('switches the cache key when attemptId changes', async () => {
getAttemptResultMock.mockImplementation(async (id: string) => ({
...stubReview,
attemptId: id,
    }));

const { result, rerender } = renderHook(
({ id }: { id: string }) => useAttemptResult({ attemptId: id }),
{ initialProps: { id: 'a1' } },
    );

await waitFor(() => {
expect(result.current.result?.attemptId).toBe('a1');
    });

rerender({ id: 'a2' });

await waitFor(() => {
expect(result.current.result?.attemptId).toBe('a2');
    });
expect(getAttemptResultMock).toHaveBeenCalledWith('a2');
  });
});

describe('useAttemptResult — error and no-result', () => {
beforeEach(() => {
authedAs('user-1');
  });

it('404 ATTEMPT_NOT_FOUND-style: null result, no error', async () => {
getAttemptResultMock.mockResolvedValue(null);

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });
expect(result.current.result).toBeNull();
expect(result.current.error).toBeNull();
  });

it('401 surfaces a typed ApiError', async () => {
getAttemptResultMock.mockRejectedValue(
makeApiError(401, 'GLOBAL_UNAUTHENTICATED', 'expired'),
    );

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.error?.code).toBe('GLOBAL_UNAUTHENTICATED');
    });
expect(result.current.result).toBeNull();
  });

it('403 ATTEMPT_FORBIDDEN surfaces a typed ApiError (not null)', async () => {
getAttemptResultMock.mockRejectedValue(
makeApiError(403, 'ATTEMPT_FORBIDDEN', 'cross-user'),
    );

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.error?.code).toBe('ATTEMPT_FORBIDDEN');
    });

expect(result.current.result).toBeNull();
expect(result.current.error).not.toBeNull();
  });

it('429 surfaces a typed ApiError with retryable signal', async () => {
getAttemptResultMock.mockRejectedValue(
makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(
() => {
expect(result.current.error?.code).toBe('GLOBAL_RATE_LIMITED');
      },
{ timeout: 5000 },
    );
  });

it('5xx surfaces a typed ApiError', async () => {
getAttemptResultMock.mockRejectedValue(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'oops'),
    );

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.error?.code).toBe('GLOBAL_INTERNAL_ERROR');
    });
  });

it('refresh revalidates the current attempt key', async () => {
getAttemptResultMock.mockResolvedValueOnce(stubReview);
getAttemptResultMock.mockResolvedValueOnce({
...stubReview,
scorePercent: 95,
    });

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.result?.scorePercent).toBe(80);
    });

await act(async () => {
await result.current.refresh();
    });

await waitFor(() => {
expect(result.current.result?.scorePercent).toBe(95);
    });
expect(getAttemptResultMock).toHaveBeenCalledTimes(2);
  });
});

describe('useAttemptResult — read-only invariant', () => {
it('never calls completeAttempt', async () => {
authedAs('user-1');
getAttemptResultMock.mockResolvedValue(stubReview);

const { result } = renderHook(() =>
useAttemptResult({ attemptId: 'a1' }),
    );

await waitFor(() => {
expect(result.current.result).toEqual(stubReview);
    });
expect(completeAttemptService).not.toHaveBeenCalled();
  });
});

void getAttemptResult;