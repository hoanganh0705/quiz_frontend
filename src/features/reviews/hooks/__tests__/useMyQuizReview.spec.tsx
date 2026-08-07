/**
 * `useMyQuizReview.spec.tsx` — unit tests for the authenticated
 * my-review hook.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.5.
 *
 * Coverage contract:
 *
 *   - Authenticated 200 returns a review.
 *   - Authenticated 404 returns `null` without an error.
 *   - Unauthenticated state fires no request.
 *   - Auth bootstrap loading does not briefly resolve to no review.
 *   - 5xx exposes error and retry.
 *   - Switching quiz IDs changes the cache key.
 *
 * Runs in the jsdom project because the hook uses
 * `useSingleWithRetry` (which depends on `useState`/`useEffect`),
 * `useAuthSession`, and `renderHook` from
 * `@testing-library/react`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useMyQuizReview } from '@/features/reviews/hooks/useMyQuizReview';
import {
  myQuizReviewKey,
  type MyReviewDto,
} from '@/features/reviews/types';

const getMyQuizReviewMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
  getMyQuizReview: getMyQuizReviewMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
}));

// Stable session id used by the authenticated tests. The key
// builder derives `sessionId` from `currentUser.userId`, so the
// mocks below feed that exact id through.
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

const sampleReview: MyReviewDto = {
  reviewId: 'r1',
  quizId: QUIZ_ID,
  quizTitle: 'Sample',
  userId: SESSION_ID,
  username: 'tester',
  rating: 5,
  comment: 'Great',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  helpfulCount: 0,
  // The id alias is composed by the type; the runtime object must
  // match the optional alias when present. We set it explicitly so
  // type narrowing in the spec is straightforward.
  id: 'r1',
};

beforeEach(() => {
  vi.clearAllMocks();
  setBootstrapAuthenticated();
});

afterEach(() => {
  getMyQuizReviewMock.mockReset();
});

describe('useMyQuizReview — authenticated 200', () => {
  it('returns the review projection and no error', async () => {
    getMyQuizReviewMock.mockResolvedValue(sampleReview);

    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.hasResolved).toBe(true);
    });

    expect(result.current.review).toMatchObject(sampleReview);
    expect(result.current.error).toBeNull();
    expect(getMyQuizReviewMock).toHaveBeenCalledWith(QUIZ_ID);
  });
});

describe('useMyQuizReview — authenticated 404', () => {
  it('returns null without an error (service-level normalisation)', async () => {
    getMyQuizReviewMock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.hasResolved).toBe(true);
    });

    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useMyQuizReview — unauthenticated', () => {
  it('does not fetch when the viewer is unauthenticated', async () => {
    setBootstrapUnauthenticated();

    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: QUIZ_ID }),
    );

    // The key is null so the primitive never fires. The hook
    // remains in a "not loading, not resolved" state, which the
    // gate hook (T-4.13.7) treats as `loading`.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasResolved).toBe(false);
    expect(getMyQuizReviewMock).not.toHaveBeenCalled();
    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when the auth bootstrap is still loading', async () => {
    setBootstrapLoading();

    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: QUIZ_ID }),
    );

    // While the bootstrap is loading, the hook stays in a
    // "not loading, not resolved" state — the gate hook will treat
    // this as `loading`. We assert isLoading stays false and
    // hasResolved never flips on.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasResolved).toBe(false);
    expect(getMyQuizReviewMock).not.toHaveBeenCalled();
  });
});

describe('useMyQuizReview — 5xx and retry', () => {
  it('5xx surfaces as ApiError and exposes retry', async () => {
    getMyQuizReviewMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
    expect(result.current.review).toBeNull();

    // After retry the error is cleared and a fresh attempt fires.
    getMyQuizReviewMock.mockResolvedValueOnce(sampleReview);
    await result.current.retry();
    await waitFor(() => {
      expect(result.current.review).toMatchObject({
        reviewId: sampleReview.reviewId,
      });
    });
    expect(result.current.error).toBeNull();
  });

  it('429 surfaces as typed ApiError after the primitive\u2019s 3-retry budget', async () => {
    // The `useSingleWithRetry` primitive retries 429 with the
    // 250 / 500 / 1000 ms backoff schedule (Epic 3.6 contract).
    // Use fake timers so the test runs deterministically.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getMyQuizReviewMock.mockRejectedValue(
        makeApiError(429, 'GLOBAL_RATE_LIMITED'),
      );

      const { result } = renderHook(() =>
        useMyQuizReview({ quizId: QUIZ_ID }),
      );

      // Advance past the full backoff schedule plus a margin so the
      // primitive exhausts its 3 retries and surfaces the error.
      await vi.advanceTimersByTimeAsync(2_000);

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(ApiError);
      });

      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).status).toBe(429);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useMyQuizReview — cache key', () => {
  it('changes the cache key when the quiz id changes', () => {
    const k1 = myQuizReviewKey('quiz-1', SESSION_ID);
    const k2 = myQuizReviewKey('quiz-2', SESSION_ID);
    expect(k1).not.toEqual(k2);
    expect(k1[2]).toBe('quiz-1');
    expect(k2[2]).toBe('quiz-2');
  });

  it('changes the cache key when the session id changes', () => {
    const k1 = myQuizReviewKey('quiz-1', 'user-1');
    const k2 = myQuizReviewKey('quiz-1', 'user-2');
    expect(k1).not.toEqual(k2);
  });

  it('disables the fetch when quizId is null', async () => {
    const { result } = renderHook(() =>
      useMyQuizReview({ quizId: null }),
    );

    // The key is null so the primitive never fires. The hook
    // remains in a "not loading, not resolved" state, which the
    // gate hook (T-4.13.7) treats as `loading`.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasResolved).toBe(false);
    expect(getMyQuizReviewMock).not.toHaveBeenCalled();
    expect(result.current.review).toBeNull();
  });
});
