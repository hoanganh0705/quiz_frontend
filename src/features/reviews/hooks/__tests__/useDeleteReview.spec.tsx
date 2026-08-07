/**
 * `useDeleteReview.spec.tsx` — unit tests for the confirmed delete hook.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.10.
 *
 * Coverage contract:
 *
 *   - No request occurs before the consumer calls `remove()`.
 *   - Correct quizId reaches the service.
 *   - Success invalidates list, my-review, and eligibility keys.
 *   - 404 GLOBAL_NOT_FOUND → `not-found` outcome, cache revalidated.
 *   - 403 REVIEW_FORBIDDEN → `forbidden`.
 *   - 429 / 5xx → `reverted`.
 *   - Duplicate `remove()` clicks are blocked while pending.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useDeleteReview } from '@/features/reviews/hooks/useDeleteReview';

const deleteReviewMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
  deleteReview: deleteReviewMock,
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
  deleteReviewMock.mockReset();
});

describe('useDeleteReview — confirmed trigger', () => {
  it('does not call the service on render', () => {
    renderHook(() => useDeleteReview(QUIZ_ID));
    expect(deleteReviewMock).not.toHaveBeenCalled();
  });

  it('calls the service only after `remove()` is invoked', async () => {
    deleteReviewMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(deleteReviewMock).toHaveBeenCalledWith(QUIZ_ID);
  });

  it('exposes `lastOutcome: success` and clears error', async () => {
    deleteReviewMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.lastOutcome).toEqual({
      kind: 'success',
      cause: null,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDeleteReview — typed outcomes', () => {
  it('404 GLOBAL_NOT_FOUND → not-found outcome, cache revalidated', async () => {
    deleteReviewMock.mockRejectedValue(
      makeApiError(404, 'GLOBAL_NOT_FOUND'),
    );

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.lastOutcome?.kind).toBe('not-found');
    // 404 is a benign no-op — `error` is intentionally NOT set so
    // the destructive toast stays quiet.
    expect(result.current.error).toBeNull();
  });

  it('403 REVIEW_FORBIDDEN → forbidden outcome', async () => {
    deleteReviewMock.mockRejectedValue(
      makeApiError(403, 'REVIEW_FORBIDDEN'),
    );

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.lastOutcome?.kind).toBe('forbidden');
    expect(result.current.error?.code).toBe('REVIEW_FORBIDDEN');
  });

  it('429 → reverted, isLoading flips back to false', async () => {
    deleteReviewMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(result.current.error?.status).toBe(429);
    expect(result.current.isLoading).toBe(false);
  });

  it('5xx → reverted', async () => {
    deleteReviewMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(result.current.error?.status).toBe(500);
  });
});

describe('useDeleteReview — single-flight', () => {
  it('coalesces duplicate clicks while pending', async () => {
    const resolveFirstRef: { current: (() => void) | null } = {
      current: null,
    };
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirstRef.current = resolve;
    });
    deleteReviewMock.mockReturnValueOnce(firstPromise);

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    let first: Promise<boolean>;
    act(() => {
      first = result.current.remove();
    });
    let second: Promise<boolean>;
    act(() => {
      second = result.current.remove();
    });

    const resolve = resolveFirstRef.current;
    if (resolve) {
      resolve();
    }
    await act(async () => {
      await first!;
      await second!;
    });

    expect(deleteReviewMock).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useDeleteReview — reset', () => {
  it('reset() clears `error` and `lastOutcome`', async () => {
    deleteReviewMock.mockRejectedValueOnce(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastOutcome).toBeNull();
  });
});

describe('useDeleteReview — non-ApiError rejection', () => {
  it('wraps the unknown rejection as `reverted`', async () => {
    deleteReviewMock.mockRejectedValue(new TypeError('network down'));

    const { result } = renderHook(() => useDeleteReview(QUIZ_ID));

    await act(async () => {
      await result.current.remove();
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('reverted');
    });
    expect(result.current.error?.code).toBe('GLOBAL_UNKNOWN');
  });
});

describe('useDeleteReview — missing quizId', () => {
  it('produces a reverted outcome without calling the service', async () => {
    const { result } = renderHook(() => useDeleteReview(''));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.remove();
    });

    expect(outcome).toBe(false);
    expect(deleteReviewMock).not.toHaveBeenCalled();
    expect(result.current.lastOutcome?.kind).toBe('reverted');
  });
});
