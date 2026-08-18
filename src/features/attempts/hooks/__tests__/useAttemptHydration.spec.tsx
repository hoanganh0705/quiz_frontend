

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import {
useAttemptHydration,
buildHydrationLockMap,
} from '@/features/attempts/hooks/useAttemptHydration';

const getAttemptMock = vi.hoisted(() => vi.fn());
const getAttemptAnswersMock = vi.hoisted(() => vi.fn());
const getAttemptAnalyticsMock = vi.hoisted(() => vi.fn());
const getAttemptReviewMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
getAttempt: getAttemptMock,
getAttemptAnswers: getAttemptAnswersMock,
getAttemptAnalytics: getAttemptAnalyticsMock,
getAttemptReview: getAttemptReviewMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

const SESSION_ID = 'user-1';
const ATTEMPT_ID = 'attempt-1';

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

function makeAttemptDetail(overrides: Partial<{ status: 'started' | 'completed' | 'abandoned' }> = {}) {
return {
attemptId: ATTEMPT_ID,
userId: SESSION_ID,
quizId: 'q1',
quizTitle: 'Sample',
quizSlug: 'sample',
versionNumber: 1,
difficulty: 'medium',
durationMs: 60000,
passingScorePercent: 60,
rewardXp: 50,
contextType: 'self',
contextRefId: null,
status: overrides.status ?? 'started',
scorePercent: null,
correctCount: null,
startedAt: '2026-08-01T00:00:00.000Z',
finishedAt: null,
timeTakenMs: null,
xpEarned: 0,
answers: [],
  };
}

function makeAnswer(overrides: Partial<{ questionId: string; selectedOptionId: string | null }> = {}) {
return {
questionId: overrides.questionId ?? 'q1',
selectedOptionId: overrides.selectedOptionId ?? 'a',
submittedAt: '2026-08-01T00:00:00.000Z',
  };
}

beforeEach(() => {
vi.clearAllMocks();
setBootstrapAuthenticated();
});

afterEach(() => {
getAttemptMock.mockReset();
getAttemptAnswersMock.mockReset();
getAttemptAnalyticsMock.mockReset();
getAttemptReviewMock.mockReset();
});

describe('useAttemptHydration — happy path', () => {
it('hydrates detail and submitted answers together', async () => {
getAttemptMock.mockResolvedValue({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockResolvedValue({
data: {
attemptId: ATTEMPT_ID,
answers: [makeAnswer({ questionId: 'q1' }), makeAnswer({ questionId: 'q2', selectedOptionId: 'b' })],
      },
    });

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });

expect(getAttemptMock).toHaveBeenCalledWith(ATTEMPT_ID);
expect(getAttemptAnswersMock).toHaveBeenCalledWith(ATTEMPT_ID);
expect(result.current.detail?.attemptId).toBe(ATTEMPT_ID);
expect(Object.keys(result.current.submittedAnswers).sort()).toEqual(['q1', 'q2']);
  });

it('hydrates empty answers without throwing', async () => {
getAttemptMock.mockResolvedValue({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockResolvedValue({
data: { attemptId: ATTEMPT_ID, answers: [] },
    });

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });

expect(result.current.submittedAnswers).toEqual({});
  });

it('returns an empty detail when the envelope has no data', async () => {
getAttemptMock.mockResolvedValue({});
getAttemptAnswersMock.mockResolvedValue({});

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });

expect(result.current.detail).toBeNull();
expect(result.current.submittedAnswers).toEqual({});
  });

it('does not invoke analytics or review services', async () => {
getAttemptMock.mockResolvedValue({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockResolvedValue({ data: { attemptId: ATTEMPT_ID, answers: [] } });

renderHook(() => useAttemptHydration({ attemptId: ATTEMPT_ID }));

await waitFor(() => {
expect(getAttemptMock).toHaveBeenCalled();
    });

expect(getAttemptAnalyticsMock).not.toHaveBeenCalled();
expect(getAttemptReviewMock).not.toHaveBeenCalled();
  });

it('hydration projection contains no isCorrect field', async () => {
getAttemptMock.mockResolvedValue({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockResolvedValue({
data: {
attemptId: ATTEMPT_ID,
answers: [
{ questionId: 'q1', selectedOptionId: 'a', submittedAt: '2026-08-01T00:00:00.000Z' },
        ],
      },
    });

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });

expect('isCorrect' in result.current.submittedAnswers).toBe(false);
expect('isCorrect' in (result.current.detail ?? {})).toBe(false);
  });
});

describe('useAttemptHydration — auth gating', () => {
it('does not fetch when the viewer is unauthenticated', async () => {
setBootstrapUnauthenticated();

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getAttemptMock).not.toHaveBeenCalled();
expect(getAttemptAnswersMock).not.toHaveBeenCalled();
expect(result.current.detail).toBeNull();
expect(result.current.submittedAnswers).toEqual({});
  });

it('does not fetch while the auth bootstrap is loading', async () => {
setBootstrapLoading();

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getAttemptMock).not.toHaveBeenCalled();
expect(getAttemptAnswersMock).not.toHaveBeenCalled();
  });

it('does not fetch when attemptId is null', async () => {
const { result } = renderHook(() =>
useAttemptHydration({ attemptId: null }),
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(getAttemptMock).not.toHaveBeenCalled();
expect(getAttemptAnswersMock).not.toHaveBeenCalled();
  });
});

describe('useAttemptHydration — error handling', () => {
it('403 surfaces as ApiError (distinct from 404)', async () => {
getAttemptMock.mockRejectedValueOnce(makeApiError(403, 'ATTEMPT_FORBIDDEN'));

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError);
    });

expect((result.current.error as ApiError).status).toBe(403);
expect(result.current.detail).toBeNull();
  });

it('404 from the detail read surfaces as ApiError (distinct from 403)', async () => {
getAttemptMock.mockRejectedValueOnce(makeApiError(404, 'ATTEMPT_NOT_FOUND'));

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError);
    });

expect((result.current.error as ApiError).status).toBe(404);
  });

it('refresh re-runs both fetchers and resolves successfully', async () => {
getAttemptMock.mockResolvedValueOnce({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockResolvedValueOnce({
data: { attemptId: ATTEMPT_ID, answers: [] },
    });

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.hasResolved).toBe(true);
    });

expect(getAttemptMock).toHaveBeenCalledTimes(1);
expect(getAttemptAnswersMock).toHaveBeenCalledTimes(1);

await result.current.refresh();

expect(getAttemptMock).toHaveBeenCalledTimes(2);
expect(getAttemptAnswersMock).toHaveBeenCalledTimes(2);
  });

it('5xx from the answers read surfaces as ApiError', async () => {
getAttemptMock.mockResolvedValue({ data: makeAttemptDetail() });
getAttemptAnswersMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderHook(() =>
useAttemptHydration({ attemptId: ATTEMPT_ID }),
    );

await waitFor(() => {
expect(result.current.error).toBeInstanceOf(ApiError);
    });

expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe('buildHydrationLockMap', () => {
it('returns an empty map for undefined', () => {
expect(buildHydrationLockMap(undefined)).toEqual({});
  });

it('returns an empty map for an empty list', () => {
expect(buildHydrationLockMap([])).toEqual({});
  });

it('reduces a single-item list to a one-entry map', () => {
const map = buildHydrationLockMap([
{ questionId: 'q1', selectedOptionId: 'a', submittedAt: '2026-08-01T00:00:00.000Z' },
    ]);
expect(map['q1']).toEqual({
questionId: 'q1',
selectedOptionId: 'a',
submittedAt: '2026-08-01T00:00:00.000Z',
    });
  });

it('deduplicates duplicate questionIds (latest wins)', () => {
const map = buildHydrationLockMap([
{ questionId: 'q1', selectedOptionId: 'a', submittedAt: '2026-08-01T00:00:00.000Z' },
{ questionId: 'q1', selectedOptionId: 'b', submittedAt: '2026-08-01T00:01:00.000Z' },
    ]);
expect(map['q1']?.selectedOptionId).toBe('b');
  });
});