/**
 * `reviews.service.spec.ts` — locks the reviews service contract.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.F7.
 *
 * Coverage per F7 AC #1:
 *
 *   - Pass-through for `createReview` (the F3 ticket body calls this
 *     out as the function whose typed `ApiError.code` must surface
 *     `REVIEW_ATTEMPT_REQUIRED` / `REVIEW_CONFLICT`).
 *   - Both surfaces asserted via a 403 and a 409 propagation case.
 *   - Pass-through for `markReviewHelpful` (the cross-tag function).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
  createReview,
  deleteReview,
  markReviewHelpful,
} from '@/features/reviews/services/reviews.service';

const quizReviewControllerCreateReviewMock = vi.fn();
const quizReviewControllerDeleteReviewMock = vi.fn();
const reviewControllerMarkReviewHelpfulMock = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getQuizzes: () => ({
      quizReviewControllerCreateReview: quizReviewControllerCreateReviewMock,
      quizReviewControllerDeleteReview: quizReviewControllerDeleteReviewMock,
    }),
    getReviews: () => ({
      reviewControllerMarkReviewHelpful: reviewControllerMarkReviewHelpfulMock,
    }),
  };
});

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

describe('reviews.service — pass-through', () => {
  it('createReview forwards the payload and returns the SDK result', async () => {
    const expected = {
      reviewId: 'r1',
      quizId: 'q1',
      rating: 5,
    };
    quizReviewControllerCreateReviewMock.mockResolvedValue(expected);

    const result = await createReview('q1', {
      rating: 5,
    } as Parameters<typeof createReview>[1]);

    expect(quizReviewControllerCreateReviewMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(expected);
  });

  it('markReviewHelpful (cross-tag) forwards reviewId and payload', async () => {
    reviewControllerMarkReviewHelpfulMock.mockResolvedValue(undefined);

    await markReviewHelpful('r1', {
      helpful: true,
    } as Parameters<typeof markReviewHelpful>[1]);

    expect(reviewControllerMarkReviewHelpfulMock).toHaveBeenCalledTimes(1);
    expect(reviewControllerMarkReviewHelpfulMock).toHaveBeenCalledWith('r1', {
      helpful: true,
    });
  });
});

describe('reviews.service — ApiError code exposure', () => {
  it('createReview surfaces 403 REVIEW_ATTEMPT_REQUIRED', async () => {
    quizReviewControllerCreateReviewMock.mockRejectedValue(
      makeApiError(403, 'REVIEW_ATTEMPT_REQUIRED', 'must complete attempt'),
    );

    await expect(
      createReview('q1', {} as Parameters<typeof createReview>[1]),
    ).rejects.toMatchObject({
      code: 'REVIEW_ATTEMPT_REQUIRED',
      status: 403,
    });
  });

  it('createReview surfaces 409 REVIEW_CONFLICT', async () => {
    quizReviewControllerCreateReviewMock.mockRejectedValue(
      makeApiError(409, 'REVIEW_CONFLICT', 'already reviewed'),
    );

    await expect(
      createReview('q1', {} as Parameters<typeof createReview>[1]),
    ).rejects.toMatchObject({
      code: 'REVIEW_CONFLICT',
      status: 409,
    });
  });

  it('deleteReview surfaces 403 REVIEW_FORBIDDEN', async () => {
    quizReviewControllerDeleteReviewMock.mockRejectedValue(
      makeApiError(403, 'REVIEW_FORBIDDEN', 'not yours'),
    );

    await expect(deleteReview('q1')).rejects.toMatchObject({
      code: 'REVIEW_FORBIDDEN',
      status: 403,
    });
  });
});