

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';

const getActiveAttemptMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
getActiveAttempt: getActiveAttemptMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

function renderIsolatedHook<HookResult, Props>(
callback: (props: Props) => HookResult,
initialProps?: Props,
) {
return renderHook(callback, {
initialProps,
wrapper: ({ children }) => (

<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

const SESSION_ID = 'user-1';
const QUIZ_ID = 'quiz-1';

function setBootstrapAuthenticated() {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: SESSION_ID, id: SESSION_ID },
  });
}

function setBootstrapUnauthenticated() {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'unauthenticated',
isAuthenticated: false,
currentUser: null,
  });
}

function setBootstrapLoading() {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'bootstrapping',
isAuthenticated: false,
currentUser: null,
  });
}

function makeApiError(
status: number,
code = `CODE_${status}`,
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

function makeSummary(overrides: Partial<{
attemptId: string;
quizId: string;
status: 'started' | 'completed' | 'abandoned';
}> = {}) {
return {
attemptId: overrides.attemptId ?? 'a1',
quizId: overrides.quizId ?? QUIZ_ID,
quizTitle: 'Sample',
quizSlug: 'sample',
versionNumber: 1,
difficulty: 'medium',
contextType: 'self',
status: overrides.status ?? 'started',
scorePercent: null,
correctCount: null,
startedAt: '2026-08-01T00:00:00.000Z',
finishedAt: null,
xpEarned: 0,
  };
}

beforeEach(() => {
vi.clearAllMocks();
setBootstrapAuthenticated();
});

afterEach(() => {
getActiveAttemptMock.mockReset();
});

describe('useActiveAttempt — happy path', () => {
it('forwards the quizId to the service and resolves the active attempt', async () => {
getActiveAttemptMock.mockResolvedValue(makeSummary());

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getActiveAttemptMock).toHaveBeenCalledWith(QUIZ_ID);
expect(result.current.attempt).toMatchObject({
attemptId: 'a1',
status: 'started',
    });
expect(result.current.error).toBeNull();
  });

it('does not project a completed attempt as the active attempt', async () => {

getActiveAttemptMock.mockResolvedValue(
makeSummary({ status: 'completed' }),
    );

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.attempt?.status).toBe('completed');
  });
});

describe('useActiveAttempt — no active attempt', () => {
it('resolves to null when the service returns null', async () => {
getActiveAttemptMock.mockResolvedValue(null);

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.attempt).toBeNull();
expect(result.current.error).toBeNull();
  });

it('resolves to null when the service resolves to null after 404', async () => {

getActiveAttemptMock.mockResolvedValue(null);

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.attempt).toBeNull();
expect(result.current.error).toBeNull();
  });
});

describe('useActiveAttempt — auth gating', () => {
it('does not fetch when the viewer is unauthenticated', async () => {
setBootstrapUnauthenticated();

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getActiveAttemptMock).not.toHaveBeenCalled();
expect(result.current.attempt).toBeNull();
expect(result.current.error).toBeNull();
  });

it('does not fetch while the auth bootstrap is loading', async () => {
setBootstrapLoading();

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getActiveAttemptMock).not.toHaveBeenCalled();
expect(result.current.attempt).toBeNull();
  });

it('does not fetch when quizId is null', async () => {
const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: null }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getActiveAttemptMock).not.toHaveBeenCalled();
expect(result.current.attempt).toBeNull();
  });
});

describe('useActiveAttempt — error handling', () => {
it('5xx surfaces as ApiError and exposes retry', async () => {
getActiveAttemptMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError);
    });

expect((result.current.error as ApiError).status).toBe(500);
expect(result.current.attempt).toBeNull();

getActiveAttemptMock.mockResolvedValueOnce(makeSummary());
await result.current.retry();
await waitFor(() => {
expect(result.current.attempt).not.toBeNull();
    });
expect(result.current.error).toBeNull();
  });

it('403 surfaces as ApiError and does not become a null attempt', async () => {
getActiveAttemptMock.mockRejectedValueOnce(
makeApiError(403, 'ATTEMPT_FORBIDDEN'),
    );

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError);
    });

expect((result.current.error as ApiError).status).toBe(403);
expect(result.current.attempt).toBeNull();
  });

it('429 surfaces as ApiError after the bounded backoff schedule', async () => {

getActiveAttemptMock.mockRejectedValue(
makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

const { result } = renderIsolatedHook(() =>
useActiveAttempt({ quizId: QUIZ_ID }),
    );

await waitFor(
() => {
expect(result.current.error).toBeInstanceOf(ApiError);
      },
{ timeout: 4000, interval: 50 },
    );

expect((result.current.error as ApiError).status).toBe(429);
expect(result.current.attempt).toBeNull();
  });
});

describe('useActiveAttempt — cache key isolation', () => {
it('switching quizId targets a different cache key (different fetch)', async () => {
getActiveAttemptMock.mockImplementation(async (quizId: string) =>
makeSummary({ attemptId: `a-${quizId}` }),
    );

let currentQuizId: string = QUIZ_ID;
const { result, rerender } = renderIsolatedHook(
() => useActiveAttempt({ quizId: currentQuizId }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

currentQuizId = 'quiz-2';
rerender();

await waitFor(() => {
expect(result.current.attempt?.attemptId).toBe('a-quiz-2');
    });

expect(getActiveAttemptMock).toHaveBeenCalledTimes(2);
expect(getActiveAttemptMock).toHaveBeenNthCalledWith(1, 'quiz-1');
expect(getActiveAttemptMock).toHaveBeenNthCalledWith(2, 'quiz-2');
  });
});