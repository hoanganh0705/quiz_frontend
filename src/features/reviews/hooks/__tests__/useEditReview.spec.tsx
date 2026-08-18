

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useEditReview } from '@/features/reviews/hooks/useEditReview';

const updateReviewMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
updateReview: updateReviewMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

const QUIZ_ID = 'quiz-1';
const SESSION_ID = 'user-1';

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
setBootstrapAuthenticated();
});

afterEach(() => {
updateReviewMock.mockReset();
});

describe('useEditReview — success', () => {
it('calls the service with the validated payload', async () => {
updateReviewMock.mockResolvedValue({ reviewId: 'r-1' });

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(updateReviewMock).toHaveBeenCalledWith(QUIZ_ID, {
rating: 4,
comment: 'Updated',
    });
  });

it('exposes `lastOutcome: success` and clears error', async () => {
updateReviewMock.mockResolvedValue({ reviewId: 'r-1' });

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.lastOutcome).toEqual({
kind: 'success',
cause: null,
    });
expect(result.current.error).toBeNull();
expect(result.current.isLoading).toBe(false);
  });
});

describe('useEditReview — typed outcomes', () => {
it('403 REVIEW_FORBIDDEN → forbidden outcome, no invalidation attempted', async () => {
updateReviewMock.mockRejectedValue(
makeApiError(403, 'REVIEW_FORBIDDEN'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.lastOutcome?.kind).toBe('forbidden');
expect(result.current.error?.code).toBe('REVIEW_FORBIDDEN');
    // The forbidden branch must NOT touch the cache — the review
    // is intact; the viewer is just not the author.
  });

it('422 REVIEW_VALIDATION → validation outcome preserves the typed error', async () => {
updateReviewMock.mockRejectedValue(
makeApiError(422, 'REVIEW_VALIDATION'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 0, comment: '' });
    });

expect(result.current.lastOutcome?.kind).toBe('validation');
expect(result.current.error?.code).toBe('REVIEW_VALIDATION');
  });

it('404 GLOBAL_NOT_FOUND → stale outcome + cache invalidation', async () => {
updateReviewMock.mockRejectedValue(
makeApiError(404, 'GLOBAL_NOT_FOUND'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.lastOutcome?.kind).toBe('stale');
expect(result.current.error?.status).toBe(404);
  });

it('429 → reverted outcome, isLoading flips back to false', async () => {
updateReviewMock.mockRejectedValue(
makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.lastOutcome?.kind).toBe('reverted');
expect(result.current.error?.status).toBe(429);
expect(result.current.isLoading).toBe(false);
  });

it('5xx → reverted outcome', async () => {
updateReviewMock.mockRejectedValue(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.lastOutcome?.kind).toBe('reverted');
expect(result.current.error?.status).toBe(500);
  });
});

describe('useEditReview — single-flight', () => {
it('coalesces a second update while the first is in flight', async () => {
const resolveFirstRef: { current: (() => void) | null } = {
current: null,
    };
const firstPromise = new Promise<void>((resolve) => {
resolveFirstRef.current = resolve;
    });
updateReviewMock.mockReturnValueOnce(firstPromise);

const { result } = renderHook(() => useEditReview(QUIZ_ID));

let first: Promise<boolean>;
act(() => {
first = result.current.update({ rating: 4, comment: 'first' });
    });
let second: Promise<boolean>;
act(() => {
second = result.current.update({ rating: 5, comment: 'second' });
    });

const resolve = resolveFirstRef.current;
if (resolve) {
resolve();
    }
await act(async () => {
await first!;
await second!;
    });

expect(updateReviewMock).toHaveBeenCalledTimes(1);
expect(result.current.isLoading).toBe(false);
  });
});

describe('useEditReview — reset', () => {
it('reset() clears `error` and `lastOutcome`', async () => {
updateReviewMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(result.current.error).not.toBeNull();

act(() => {
result.current.reset();
    });

expect(result.current.error).toBeNull();
expect(result.current.lastOutcome).toBeNull();
  });
});

describe('useEditReview — non-ApiError rejection', () => {
it('wraps the unknown rejection as `reverted`', async () => {
updateReviewMock.mockRejectedValue(new TypeError('network down'));

const { result } = renderHook(() => useEditReview(QUIZ_ID));

await act(async () => {
await result.current.update({ rating: 4, comment: 'Updated' });
    });

await waitFor(() => {
expect(result.current.lastOutcome?.kind).toBe('reverted');
    });
expect(result.current.error?.code).toBe('GLOBAL_UNKNOWN');
  });
});

describe('useEditReview — missing quizId', () => {
it('produces a validation outcome without calling the service', async () => {
const { result } = renderHook(() => useEditReview(''));

let outcome: boolean | undefined;
await act(async () => {
outcome = await result.current.update({ rating: 4, comment: 'Updated' });
    });

expect(outcome).toBe(false);
expect(updateReviewMock).not.toHaveBeenCalled();
expect(result.current.lastOutcome?.kind).toBe('validation');
  });
});
