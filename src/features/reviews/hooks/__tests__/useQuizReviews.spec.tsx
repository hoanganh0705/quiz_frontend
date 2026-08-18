

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { useQuizReviews } from '@/features/reviews/hooks/useQuizReviews';
import {
REVIEWS_DEFAULT_LIMIT,
quizReviewsKey,
} from '@/features/reviews/types';

const listQuizReviewsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
listQuizReviews: listQuizReviewsMock,
}));

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

function makeReview(reviewId: string) {
return {
reviewId,
quizId: 'quiz-1',
userId: 'user-1',
username: 'tester',
userAvatarUrl: null,
rating: 5,
comment: `body of ${reviewId}`,
createdAt: '2026-08-01T00:00:00.000Z',
updatedAt: '2026-08-01T00:00:00.000Z',
helpfulCount: 0,
  };
}

function mockPageResponse(
items: ReturnType<typeof makeReview>[],
opts: { nextCursor?: string | null; hasNextPage?: boolean } = {},
) {
return {
data: items,
meta: {
pagination: {
kind: 'cursor',
limit: items.length,
nextCursor: opts.nextCursor ?? null,
hasNextPage: opts.hasNextPage ?? false,
      },
    },
  };
}

function makeWrapper() {

return ({ children }: { children: React.ReactNode }) => (
<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
listQuizReviewsMock.mockReset();
});

describe('useQuizReviews — default mode', () => {
it('calls listQuizReviews with REVIEWS_DEFAULT_LIMIT and no cursor', async () => {
listQuizReviewsMock.mockResolvedValue(mockPageResponse([makeReview('r1')]));

const { result } = renderHook(
() => useQuizReviews({ quizId: 'quiz-1' }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizReviewsMock).toHaveBeenCalledWith('quiz-1', {
cursor: undefined,
limit: REVIEWS_DEFAULT_LIMIT,
    });
  });

it('returns items with the id alias after success', async () => {
listQuizReviewsMock.mockResolvedValue(
mockPageResponse([makeReview('r1'), makeReview('r2')]),
    );

const { result } = renderHook(
() => useQuizReviews({ quizId: 'quiz-1' }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.items.length).toBe(2);
    });

expect(result.current.items[0]!.id).toBe('r1');
expect(result.current.items[1]!.id).toBe('r2');
  });

it('exposes hasMore=true when the server reports hasNextPage', async () => {
listQuizReviewsMock.mockResolvedValue(
mockPageResponse([makeReview('r1')], {
hasNextPage: true,
nextCursor: 'abc',
      }),
    );

const { result } = renderHook(
() => useQuizReviews({ quizId: 'quiz-1' }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.hasMore).toBe(true);
  });
});

describe('useQuizReviews — disabled state', () => {
it('does not fetch when quizId is null', async () => {
const { result } = renderHook(
() => useQuizReviews({ quizId: null }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizReviewsMock).not.toHaveBeenCalled();
expect(result.current.items).toEqual([]);
expect(result.current.error).toBeNull();
  });
});

describe('useQuizReviews — error propagation', () => {
it('5xx surfaces as ApiError on result.error', async () => {
listQuizReviewsMock.mockRejectedValue(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderHook(
() => useQuizReviews({ quizId: 'quiz-1' }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.error).toBeInstanceOf(ApiError);
expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe('useQuizReviews — cursor pass-through', () => {
it('forwards the explicit cursor filter to the service', async () => {
listQuizReviewsMock.mockResolvedValue(mockPageResponse([]));

const { result } = renderHook(
() =>
useQuizReviews({
quizId: 'quiz-1',
filters: { cursor: 'page-2-cursor', limit: 5 },
        }),
{ wrapper: makeWrapper() },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(listQuizReviewsMock).toHaveBeenCalledWith('quiz-1', {
cursor: 'page-2-cursor',
limit: 5,
    });
  });
});

describe('quizReviewsKey — SWR key factory', () => {
it('starts with the reviews + quiz discriminators and embeds the quiz id', () => {
const key = quizReviewsKey('quiz-1');
expect(key[0]).toBe('reviews');
expect(key[1]).toBe('quiz');
expect(key[2]).toBe('quiz-1');
  });

it('embeds cursor + limit when filters are passed', () => {
const key = quizReviewsKey('quiz-1', { cursor: 'p2', limit: 10 });
expect(key[3]).toEqual(['p2', 10]);
  });
});
