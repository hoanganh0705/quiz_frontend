

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
createReview,
deleteReview,
getMyQuizReview,
markReviewHelpful,
unmarkReviewHelpful,
updateReview,
} from '@/features/reviews/services/reviews.service';

const quizReviewControllerCreateReviewMock = vi.fn();
const quizReviewControllerUpdateReviewMock = vi.fn();
const quizReviewControllerDeleteReviewMock = vi.fn();
const reviewControllerMarkReviewHelpfulMock = vi.fn();
const reviewControllerRemoveHelpfulVoteMock = vi.fn();
const userReviewControllerGetMyReviewForQuizMock = vi.fn();

vi.mock('@/lib/api', async () => {
const actual =
await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return {
...actual,
getQuizzes: () => ({
quizReviewControllerCreateReview: quizReviewControllerCreateReviewMock,
quizReviewControllerUpdateReview: quizReviewControllerUpdateReviewMock,
quizReviewControllerDeleteReview: quizReviewControllerDeleteReviewMock,
    }),
getReviews: () => ({
reviewControllerMarkReviewHelpful: reviewControllerMarkReviewHelpfulMock,
reviewControllerRemoveHelpfulVote: reviewControllerRemoveHelpfulVoteMock,
    }),
getUsers: () => ({
userReviewControllerGetMyReviewForQuiz:
userReviewControllerGetMyReviewForQuizMock,
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

it('unmarkReviewHelpful (cross-tag) forwards reviewId', async () => {
reviewControllerRemoveHelpfulVoteMock.mockResolvedValue(undefined);

await unmarkReviewHelpful('r1');

expect(reviewControllerRemoveHelpfulVoteMock).toHaveBeenCalledTimes(1);
expect(reviewControllerRemoveHelpfulVoteMock).toHaveBeenCalledWith('r1');
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

it('updateReview surfaces 422 REVIEW_VALIDATION', async () => {
quizReviewControllerUpdateReviewMock.mockRejectedValue(
makeApiError(422, 'REVIEW_VALIDATION', 'bad payload'),
    );

await expect(
updateReview('q1', {} as Parameters<typeof updateReview>[1]),
    ).rejects.toMatchObject({
code: 'REVIEW_VALIDATION',
status: 422,
    });
  });
});

describe('reviews.service — getMyQuizReview (T-4.13.1)', () => {
it('forwards quizId and unwraps the { data } envelope', async () => {
const review = {
reviewId: 'r1',
quizId: 'q1',
quizTitle: 'Sample',
userId: 'u1',
username: 'tester',
rating: 5,
comment: 'Great',
createdAt: '2026-08-01T00:00:00.000Z',
updatedAt: '2026-08-01T00:00:00.000Z',
helpfulCount: 0,
    };
userReviewControllerGetMyReviewForQuizMock.mockResolvedValue({
data: review,
    });

const result = await getMyQuizReview('q1');

expect(userReviewControllerGetMyReviewForQuizMock).toHaveBeenCalledTimes(1);
expect(userReviewControllerGetMyReviewForQuizMock).toHaveBeenCalledWith('q1');
expect(result).toBe(review);
  });

it('normalises 404 to null so the gate hook can branch on a typed result', async () => {
userReviewControllerGetMyReviewForQuizMock.mockRejectedValue(
makeApiError(404, 'REVIEW_NOT_FOUND', 'no review yet'),
    );

await expect(getMyQuizReview('q1')).resolves.toBeNull();
expect(userReviewControllerGetMyReviewForQuizMock).toHaveBeenCalledWith('q1');
  });

it('propagates 401/403/429/5xx as typed ApiError (not as null)', async () => {
userReviewControllerGetMyReviewForQuizMock.mockRejectedValueOnce(
makeApiError(401, 'GLOBAL_UNAUTHENTICATED', 'no session'),
    );
await expect(getMyQuizReview('q1')).rejects.toMatchObject({
code: 'GLOBAL_UNAUTHENTICATED',
status: 401,
    });

userReviewControllerGetMyReviewForQuizMock.mockRejectedValueOnce(
makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );
await expect(getMyQuizReview('q1')).rejects.toMatchObject({
status: 429,
    });

userReviewControllerGetMyReviewForQuizMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'boom'),
    );
await expect(getMyQuizReview('q1')).rejects.toMatchObject({
status: 500,
    });
  });
});
