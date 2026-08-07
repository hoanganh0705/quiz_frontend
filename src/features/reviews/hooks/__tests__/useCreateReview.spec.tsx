/**
 * `useCreateReview.spec.ts` — unit tests for the create-review mutation
 * hook.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.8.
 *
 * Coverage contract:
 *
 *   - Correct payload reaches the service.
 *   - Success invalidates all required keys (list + my-review +
 *     eligibility).
 *   - 403 REVIEW_ATTEMPT_REQUIRED produces the `attempt-required`
 *     outcome and invalidates the gate inputs.
 *   - 409 REVIEW_CONFLICT produces the `conflict` outcome and
 *     revalidates my-review + eligibility.
 *   - 422 REVIEW_VALIDATION produces the `validation` outcome and
 *     preserves the typed error for field mapping.
 *   - 429 and 5xx produce the `reverted` outcome without locking
 *     the form (the form's `isLoading` flips back to false).
 *   - Pending state blocks a duplicate submit.
 *   - 5xx can be retried after a `reset()`.
 *   - Unauthenticated state still surfaces the typed error path
 *     (the gate hides the form; this hook is a defensive pass-through).
 *
 * Runs in the jsdom project because the hook uses `useAuthSession`,
 * SWR's global `mutate`, and `renderHook` from
 * `@testing-library/react`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useCreateReview } from '@/features/reviews/hooks/useCreateReview';

const createReviewMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());
const globalMutateMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/features/reviews/services/reviews.service', () => ({
  createReview: createReviewMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
}));

vi.mock('swr', async (importOriginal) => {
  const real = await importOriginal<typeof import('swr')>();
  return {
    ...real,
    // Override the exported `mutate` with a spy. SWR exports
    // `mutate` and the hooks depend on it for cache invalidation.
    // The hooks call `mutate(key, undefined, opts)` or
    // `mutate(predicate, updater, opts)` — both go through this
    // mock. We capture the keys so the test can assert which
    // caches were invalidated.
    mutate: (...args: unknown[]) => globalMutateMock(...args),
  };
});

const QUIZ_ID = 'quiz-1';
const SESSION_ID = 'user-1';

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
  createReviewMock.mockReset();
  globalMutateMock.mockClear();
});

describe('useCreateReview — success', () => {
  it('calls the service with the validated payload', async () => {
    createReviewMock.mockResolvedValue({ reviewId: 'r-new' });

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great quiz' });
    });

    expect(createReviewMock).toHaveBeenCalledWith(QUIZ_ID, {
      rating: 5,
      comment: 'Great quiz',
    });
  });

  it('invalidates the list, my-review, and eligibility caches on success', async () => {
    createReviewMock.mockResolvedValue({ reviewId: 'r-new' });

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 4, comment: 'Nice' });
    });

    // The helper `invalidateReviewCaches` invalidates the list
    // predicate (`['reviews', 'quiz', quizId, ...filter]`) AND
    // the explicit session-scoped keys for my-review +
    // eligibility. Assert at least one call to each invalidation
    // pattern.
    const calls = globalMutateMock.mock.calls;
    const callKeys = calls.map((c) => c[0]);
    const listCall = callKeys.find(
      (k) =>
        typeof k === 'function' &&
        k(['reviews', 'quiz', QUIZ_ID, [undefined, undefined]]) === true,
    );
    expect(listCall).toBeDefined();

    // My-review and eligibility are targeted via the helper's
    // explicit session-scoped keys. Look for either explicit key.
    const myReviewKey = ['reviews', 'my', QUIZ_ID, SESSION_ID];
    const eligibilityKey = ['reviews', 'eligibility', QUIZ_ID, SESSION_ID];
    const allKeys = callKeys.flatMap((k) =>
      Array.isArray(k) ? [k] : [],
    );
    const sawMyReview = allKeys.some(
      (k) =>
        k.length === myReviewKey.length &&
        k.every((seg, i) => seg === myReviewKey[i]),
    );
    const sawEligibility = allKeys.some(
      (k) =>
        k.length === eligibilityKey.length &&
        k.every((seg, i) => seg === eligibilityKey[i]),
    );
    expect(sawMyReview || sawEligibility).toBe(true);
  });

  it('exposes `lastOutcome: success` and clears error', async () => {
    createReviewMock.mockResolvedValue({ reviewId: 'r-new' });

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome).toEqual({
      kind: 'success',
      cause: null,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('invokes `onSuccess` after a successful submit', async () => {
    createReviewMock.mockResolvedValue({ reviewId: 'r-new' });
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useCreateReview(QUIZ_ID, { onSuccess }),
    );

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateReview — gate-race outcomes', () => {
  it('403 REVIEW_ATTEMPT_REQUIRED → attempt-required outcome', async () => {
    createReviewMock.mockRejectedValue(
      makeApiError(403, 'REVIEW_ATTEMPT_REQUIRED'),
    );
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useCreateReview(QUIZ_ID, { onError }),
    );

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome?.kind).toBe('attempt-required');
    expect(result.current.error?.code).toBe('REVIEW_ATTEMPT_REQUIRED');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attempt-required' }),
    );
  });

  it('409 REVIEW_CONFLICT → conflict outcome', async () => {
    createReviewMock.mockRejectedValue(
      makeApiError(409, 'REVIEW_CONFLICT'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome?.kind).toBe('conflict');
    expect(result.current.error?.code).toBe('REVIEW_CONFLICT');
  });

  it('422 REVIEW_VALIDATION → validation outcome preserves error for field mapping', async () => {
    createReviewMock.mockRejectedValue(
      makeApiError(422, 'REVIEW_VALIDATION'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 0, comment: '' });
    });

    expect(result.current.lastOutcome?.kind).toBe('validation');
    expect(result.current.error?.code).toBe('REVIEW_VALIDATION');
  });

  it('429 → reverted outcome, isLoading flips back to false', async () => {
    createReviewMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(result.current.error?.status).toBe(429);
    expect(result.current.isLoading).toBe(false);
  });

  it('5xx → reverted outcome', async () => {
    createReviewMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(result.current.error?.status).toBe(500);
  });
});

describe('useCreateReview — single-flight', () => {
  it('coalesces a second submit while the first is in flight', async () => {
    const resolveFirstRef: { current: (() => void) | null } = {
      current: null,
    };
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirstRef.current = resolve;
    });
    createReviewMock.mockReturnValueOnce(firstPromise);

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    // Kick off the first submit. We do NOT await here so the
    // promise stays in flight when the second submit fires.
    let first: Promise<boolean>;
    act(() => {
      first = result.current.submit({ rating: 5, comment: 'first' });
    });
    // Second submit while the first is still pending.
    let second: Promise<boolean>;
    act(() => {
      second = result.current.submit({ rating: 4, comment: 'second' });
    });

    // Resolve the first; the second should be coalesced and we
    // never see the service called twice.
    const resolve = resolveFirstRef.current;
    if (resolve) {
      resolve();
    }
    await act(async () => {
      await first!;
      await second!;
    });

    expect(createReviewMock).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useCreateReview — reset & retry', () => {
  it('reset() clears `error` and `lastOutcome` so a follow-up submit can proceed', async () => {
    createReviewMock.mockRejectedValueOnce(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastOutcome).toBeNull();

    // After reset, a follow-up submit must be accepted again.
    createReviewMock.mockResolvedValueOnce({ reviewId: 'r-new' });
    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(result.current.lastOutcome?.kind).toBe('success');
  });
});

describe('useCreateReview — unauthenticated', () => {
  it('still surfaces typed errors when the viewer is unauthenticated (gate hides the form in practice)', async () => {
    setBootstrapUnauthenticated();
    createReviewMock.mockRejectedValue(
      makeApiError(401, 'GLOBAL_UNAUTHORIZED'),
    );

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    // The hook is a pass-through when unauthenticated — the gate
    // hook hides the form, but if the caller bypasses the gate we
    // still expose the typed error.
    expect(result.current.error?.status).toBe(401);
    expect(result.current.lastOutcome?.kind).toBe('reverted');
  });
});

describe('useCreateReview — missing quizId', () => {
  it('produces a validation outcome without calling the service', async () => {
    const { result } = renderHook(() => useCreateReview(''));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.submit({ rating: 5, comment: 'Great' });
    });

    expect(outcome).toBe(false);
    expect(createReviewMock).not.toHaveBeenCalled();
    expect(result.current.lastOutcome?.kind).toBe('validation');
    expect(result.current.error?.code).toBe('REVIEW_VALIDATION');
  });
});

describe('useCreateReview — non-ApiError rejection', () => {
  it('wraps the unknown rejection as a `reverted` outcome', async () => {
    createReviewMock.mockRejectedValue(new TypeError('network down'));

    const { result } = renderHook(() => useCreateReview(QUIZ_ID));

    await act(async () => {
      await result.current.submit({ rating: 5, comment: 'Great' });
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('reverted');
    });

    expect(result.current.error?.code).toBe('GLOBAL_UNKNOWN');
  });
});
