

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
unstable_serialize,
} from 'swr';

import { cache as swrDefaultCache } from 'swr/_internal';

import { ApiError } from '@/lib/api';

import { useHelpfulReview } from '@/features/reviews/hooks/useHelpfulReview';
import type { ReviewDto } from '@/features/reviews/types';
import type { CursorPage } from '@/lib/api/use-cursor-paginated.types';

const markReviewHelpfulMock = vi.hoisted(() => vi.fn());
const unmarkReviewHelpfulMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/reviews/services/reviews.service', () => ({
markReviewHelpful: markReviewHelpfulMock,
unmarkReviewHelpful: unmarkReviewHelpfulMock,
}));

const QUIZ_ID = 'quiz-1';
const REVIEW_ID = 'r-1';

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

function makeReview(overrides: Partial<ReviewDto> = {}): ReviewDto {
return {
reviewId: REVIEW_ID,
quizId: QUIZ_ID,
userId: 'other-user',
username: 'tester',
userAvatarUrl: null,
rating: 5,
comment: 'Great',
createdAt: '2026-08-01T00:00:00.000Z',
updatedAt: '2026-08-01T00:00:00.000Z',
helpfulCount: 3,
id: REVIEW_ID,
...overrides,
  };
}

function makePage(items: ReviewDto[]): CursorPage<ReviewDto> {
return {
items,
nextCursor: null,
hasNextPage: false,
limit: items.length,
  };
}

async function seedCachedPages(): Promise<void> {
const page1 = makePage([makeReview({ helpfulCount: 3 })]);
const page2 = makePage([makeReview({ helpfulCount: 5 })]);
const key1 = [
'reviews',
'quiz',
QUIZ_ID,
[undefined, undefined],
  ] as unknown as readonly unknown[];
const key2 = [
'reviews',
'quiz',
QUIZ_ID,
['cursor-2', undefined],
  ] as unknown as readonly unknown[];
(swrDefaultCache as Map<string, unknown>).set(unstable_serialize(key1), {
data: page1,
_k: key1,
  });
(swrDefaultCache as Map<string, unknown>).set(unstable_serialize(key2), {
data: page2,
_k: key2,
  });
}

function readCachedPage<T>(
cacheKey: readonly unknown[],
): T | undefined {
const serialized = unstable_serialize(cacheKey);
const entry = (swrDefaultCache as Map<string, unknown>).get(serialized) as
| { data?: T }
    | undefined;
if (entry && typeof entry === 'object' && 'data' in entry) {
return entry.data;
  }
return entry as T | undefined;
}

beforeEach(() => {
vi.clearAllMocks();

(swrDefaultCache as Map<string, unknown>).clear();
});

afterEach(() => {
markReviewHelpfulMock.mockReset();
unmarkReviewHelpfulMock.mockReset();
});

describe('useHelpfulReview — mark path', () => {
it('calls markReviewHelpful with helpful: true when transitioning from unmarked to marked', async () => {
markReviewHelpfulMock.mockResolvedValue(undefined);

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

expect(markReviewHelpfulMock).toHaveBeenCalledWith(REVIEW_ID, {
helpful: true,
    });
expect(unmarkReviewHelpfulMock).not.toHaveBeenCalled();
  });

it('flips viewerMarkedHelpful synchronously and increments helpfulCount on every cached page', async () => {
markReviewHelpfulMock.mockResolvedValue(undefined);
await seedCachedPages();

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

expect(result.current.viewerMarkedHelpful).toBe(true);

const after1 = readCachedPage<CursorPage<ReviewDto>>([
'reviews',
'quiz',
QUIZ_ID,
[undefined, undefined],
    ]);
const after2 = readCachedPage<CursorPage<ReviewDto>>([
'reviews',
'quiz',
QUIZ_ID,
['cursor-2', undefined],
    ]);

expect(after1?.items[0].helpfulCount).toBe(4);
expect(after2?.items[0].helpfulCount).toBe(6);
  });
});

describe('useHelpfulReview — unmark path', () => {
it('calls unmarkReviewHelpful when transitioning from marked to unmarked', async () => {
unmarkReviewHelpfulMock.mockResolvedValue(undefined);

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: true,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

expect(unmarkReviewHelpfulMock).toHaveBeenCalledWith(REVIEW_ID);
expect(markReviewHelpfulMock).not.toHaveBeenCalled();
expect(result.current.viewerMarkedHelpful).toBe(false);
  });

it('decrements helpfulCount but clamps at 0', async () => {
unmarkReviewHelpfulMock.mockResolvedValue(undefined);
const zeroPage = makePage([makeReview({ helpfulCount: 0 })]);
const key1 = [
'reviews',
'quiz',
QUIZ_ID,
[undefined, undefined],
    ] as unknown as readonly unknown[];
(swrDefaultCache as Map<string, unknown>).set(unstable_serialize(key1), {
data: zeroPage,
_k: key1,
    });

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: true,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

expect(result.current.viewerMarkedHelpful).toBe(false);

const after = readCachedPage<CursorPage<ReviewDto>>([
'reviews',
'quiz',
QUIZ_ID,
[undefined, undefined],
    ]);

expect(after?.items[0].helpfulCount).toBe(0);
  });
});

describe('useHelpfulReview — failure rollback', () => {
it('5xx restores previous viewer state and surfaces typed ApiError', async () => {
markReviewHelpfulMock.mockRejectedValue(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );
await seedCachedPages();

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

await waitFor(() => {
expect(result.current.lastError).toBeInstanceOf(ApiError);
    });

expect(result.current.viewerMarkedHelpful).toBe(false);
expect(result.current.lastError?.status).toBe(500);
expect(result.current.isPending).toBe(false);
  });

it('REVIEW_FORBIDDEN (self-review defensive) rolls back safely', async () => {
markReviewHelpfulMock.mockRejectedValue(
makeApiError(403, 'REVIEW_FORBIDDEN'),
    );

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

await waitFor(() => {
expect(result.current.lastError?.code).toBe('REVIEW_FORBIDDEN');
    });

expect(result.current.viewerMarkedHelpful).toBe(false);
  });

it('429 preserves retry capability', async () => {
markReviewHelpfulMock.mockRejectedValue(
makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

await waitFor(() => {
expect(result.current.lastError?.status).toBe(429);
    });

expect(result.current.viewerMarkedHelpful).toBe(false);
  });
});

describe('useHelpfulReview — cooldown', () => {
it('rapid clicks within 500 ms produce at most one in-flight request', async () => {
const resolveFirstRef: { current: (() => void) | null } = {
current: null,
    };
const firstPromise = new Promise<void>((resolve) => {
resolveFirstRef.current = resolve;
    });
markReviewHelpfulMock.mockReturnValueOnce(firstPromise);

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

let first: Promise<void>;
let second: Promise<void>;
act(() => {
first = result.current.toggle();
    });
act(() => {
second = result.current.toggle();
    });

const resolve = resolveFirstRef.current;
if (resolve) {
resolve();
    }
await act(async () => {
await first!;
await second!;
    });

expect(markReviewHelpfulMock).toHaveBeenCalledTimes(1);
  });
});

describe('useHelpfulReview — reset', () => {
it('reset() clears `lastError`', async () => {
markReviewHelpfulMock.mockRejectedValue(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

await waitFor(() => {
expect(result.current.lastError).not.toBeNull();
    });

act(() => {
result.current.reset();
    });

expect(result.current.lastError).toBeNull();
  });
});

describe('useHelpfulReview — non-ApiError rejection', () => {
it('wraps the unknown rejection as `GLOBAL_UNKNOWN`', async () => {
markReviewHelpfulMock.mockRejectedValue(new TypeError('network down'));

const { result } = renderHook(() =>
useHelpfulReview({
quizId: QUIZ_ID,
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

await waitFor(() => {
expect(result.current.lastError?.code).toBe('GLOBAL_UNKNOWN');
    });

expect(result.current.viewerMarkedHelpful).toBe(false);
  });
});

describe('useHelpfulReview — missing identity', () => {
it('does nothing when quizId is empty', async () => {
const { result } = renderHook(() =>
useHelpfulReview({
quizId: '',
reviewId: REVIEW_ID,
initialViewerMarkedHelpful: false,
      }),
    );

await act(async () => {
await result.current.toggle();
    });

expect(markReviewHelpfulMock).not.toHaveBeenCalled();
expect(unmarkReviewHelpfulMock).not.toHaveBeenCalled();
expect(result.current.viewerMarkedHelpful).toBe(false);
  });
});
