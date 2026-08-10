/**
 * `useReview.spec.tsx` — unit tests for the offending-review
 * single-read hook.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.C3.
 *
 * Coverage contract:
 *
 *   - `null` reviewId disables the hook (no fetch, no loading).
 *   - Successful fetch returns the unwrapped `ReviewDetailResponseDto`.
 *   - Backend returning a wrapped payload with `data: undefined`
 *     surfaces `review: null` without an error.
 *   - `ApiError` surfaces as the typed `error.code`.
 *   - Switching ids updates the SWR key; the same id never fetches
 *     twice in a row without a state change (SWR dedupe).
 *   - `ReviewDetailResponseDto.reviewId` round-trips intact.
 *
 * Runs in the jsdom project because the hook uses `useSWR`
 * (`@testing-library/react` with hooks requires jsdom).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { useReview, REVIEW_READ_KEY } from '@/features/admin/review-moderation/hooks/useReview';
import type { ReviewDetailResponseDto } from '@/lib/api/generated/schemas';

// ─── Service mock ───────────────────────────────────────────────────────────

const getReviewByIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
  getReviewById: getReviewByIdMock,
}));

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeApiError(
  status: number,
  code = `CODE_${status}`,
  message = `Mock ${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
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

function makeReview(overrides: Partial<ReviewDetailResponseDto> = {}): ReviewDetailResponseDto {
  return {
    reviewId: 'rv-1',
    quizId: 'qz-1',
    quizTitle: 'Sample quiz',
    userId: 'user-1',
    username: 'tester',
    rating: 4,
    comment: 'Looks fine',
    helpfulCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function withFreshSWRCache({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Provide a fresh SWR cache per render so re-renders do not bleed
  // cache between test cases.
  return (
     
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

beforeEach(() => {
  getReviewByIdMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.5.C3 — useReview', () => {
  it('returns the disabled snapshot when reviewId is null (no fetch)', async () => {
    getReviewByIdMock.mockResolvedValue({ data: makeReview() });

    const { result } = renderHook(() => useReview(null), {
      wrapper: withFreshSWRCache,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
    expect(getReviewByIdMock).not.toHaveBeenCalled();
  });

  it('returns the unwrapped review payload on success', async () => {
    const review = makeReview({ reviewId: 'rv-42', comment: 'Spammy copy' });
    getReviewByIdMock.mockResolvedValue({ data: review });

    const { result } = renderHook(() => useReview('rv-42'), {
      wrapper: withFreshSWRCache,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.review).toMatchObject({ reviewId: 'rv-42', comment: 'Spammy copy' });
    expect(result.current.error).toBeNull();
    expect(getReviewByIdMock).toHaveBeenCalledTimes(1);
    expect(getReviewByIdMock).toHaveBeenCalledWith('rv-42');
  });

  it('returns review: null when the wrapped payload has no data field', async () => {
    // The backend contract permits `data: undefined` when the review
    // was deleted between the report listing and the side-panel
    // read; the hook must not throw and must surface null cleanly.
    getReviewByIdMock.mockResolvedValue({});

    const { result } = renderHook(() => useReview('rv-ghost'), {
      wrapper: withFreshSWRCache,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces the typed ApiError code on failure', async () => {
    getReviewByIdMock.mockRejectedValue(makeApiError(404, 'REVIEW_NOT_FOUND'));

    const { result } = renderHook(() => useReview('rv-missing'), {
      wrapper: withFreshSWRCache,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe('REVIEW_NOT_FOUND');
    expect(result.current.review).toBeNull();
  });

  it('does not retry after a failure (shouldRetryOnError: false)', async () => {
    getReviewByIdMock.mockRejectedValue(makeApiError(500, 'GLOBAL_INTERNAL_ERROR'));

    renderHook(() => useReview('rv-err'), {
      wrapper: withFreshSWRCache,
    });

    // Allow the first request to resolve.
    await waitFor(() => expect(getReviewByIdMock).toHaveBeenCalledTimes(1));

    // Wait a bit longer than the typical retry window so any retry
    // would have fired.
    await new Promise((r) => setTimeout(r, 100));

    expect(getReviewByIdMock).toHaveBeenCalledTimes(1);
  });

  it('switches the cache key when the id changes', async () => {
    getReviewByIdMock.mockImplementation(async (id: string) => ({
      data: makeReview({ reviewId: id }),
    }));

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useReview(id),
      {
        wrapper: withFreshSWRCache,
        initialProps: { id: 'rv-a' as string | null },
      },
    );

    await waitFor(() =>
      expect(result.current.review).toMatchObject({ reviewId: 'rv-a' }),
    );

    rerender({ id: 'rv-b' });

    await waitFor(() =>
      expect(result.current.review).toMatchObject({ reviewId: 'rv-b' }),
    );

    expect(getReviewByIdMock).toHaveBeenCalledTimes(2);
    expect(getReviewByIdMock).toHaveBeenNthCalledWith(1, 'rv-a');
    expect(getReviewByIdMock).toHaveBeenNthCalledWith(2, 'rv-b');
  });

  it('clears state when transitioning from active id to null', async () => {
    getReviewByIdMock.mockResolvedValue({ data: makeReview({ reviewId: 'rv-x' }) });

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useReview(id),
      {
        wrapper: withFreshSWRCache,
        initialProps: { id: 'rv-x' as string | null },
      },
    );

    await waitFor(() => expect(result.current.review).not.toBeNull());

    rerender({ id: null });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not fetch the same id twice without a state change (SWR dedupe)', async () => {
    let resolve: ((value: unknown) => void) | null = null;
    getReviewByIdMock.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );

    const { result } = renderHook(() => useReview('rv-dedupe'), {
      wrapper: withFreshSWRCache,
    });

    // Force several re-renders that observe the same id and an
    // outstanding in-flight fetch.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.review).toBeNull();

    // Resolve the in-flight call.
    await waitFor(() => {
      if (resolve) {
        resolve({ data: makeReview({ reviewId: 'rv-dedupe' }) });
        resolve = null;
      }
    });

    await waitFor(() =>
      expect(result.current.review).toMatchObject({ reviewId: 'rv-dedupe' }),
    );

    expect(getReviewByIdMock).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.5.C3 — REVIEW_READ_KEY', () => {
  it('encodes the id in a stable, namespaced tuple', () => {
    expect(REVIEW_READ_KEY('rv-1')).toEqual([
      'admin',
      'review-moderation',
      'review',
      'rv-1',
    ]);
    expect(REVIEW_READ_KEY(null)).toEqual([
      'admin',
      'review-moderation',
      'review',
      null,
    ]);
  });
});
