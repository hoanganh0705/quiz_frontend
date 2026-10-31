
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuizzesLoadMore } from '../useQuizzesLoadMore';
import type {
  QuizzesBundlePageInfo,
} from '../useQuizzesLoadMore';

interface FetchMoreCall {
  variables: Record<string, unknown> | undefined;
  updateQuery:
    | ((
        previous: Record<string, unknown>,
        options: { fetchMoreResult: Record<string, unknown> | null | undefined },
      ) => Record<string, unknown>)
    | undefined;
}

function makeBundle(items: unknown[], pageInfo: Record<string, unknown>) {
  return { quizzesBundle: { items, pageInfo } };
}

function makeFetchMore(
  impl: (call: FetchMoreCall) => Promise<unknown>,
): {
  fn: (options: FetchMoreCall) => Promise<unknown>;
  calls: FetchMoreCall[];
} {
  const calls: FetchMoreCall[] = [];
  const fn = vi.fn(async (options: FetchMoreCall) => {
    calls.push(options);
    return impl(options);
  });
  return { fn, calls };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useQuizzesLoadMore — flag derivation', () => {
  it('hasMore is true when pageInfo.hasNextPage is true', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-1',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({
        pageInfo,
        fetchMore,
        baseVariables: { limit: 20 },
      }),
    );

    expect(result.current.hasMore).toBe(true);
  });

  it('hasMore is false when pageInfo.hasNextPage is false', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: false,
      limit: 20,
      nextCursor: null,
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({
        pageInfo,
        fetchMore,
        baseVariables: { limit: 20 },
      }),
    );

    expect(result.current.hasMore).toBe(false);
  });

  it('hasMore is false when pageInfo is null or undefined', () => {
    const fetchMore = vi.fn();

    const { result: nullResult } = renderHook(() =>
      useQuizzesLoadMore({
        pageInfo: null,
        fetchMore,
        baseVariables: {},
      }),
    );
    expect(nullResult.current.hasMore).toBe(false);

    const { result: undefinedResult } = renderHook(() =>
      useQuizzesLoadMore({
        pageInfo: undefined,
        fetchMore,
        baseVariables: {},
      }),
    );
    expect(undefinedResult.current.hasMore).toBe(false);
  });
});

describe('useQuizzesLoadMore — loadMore contract', () => {
  it('does NOT call fetchMore when hasNextPage is false', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: false,
      limit: 20,
      nextCursor: null,
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    act(() => result.current.loadMore());
    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('does NOT call fetchMore when nextCursor is null', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: null,
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    act(() => result.current.loadMore());
    expect(fetchMore).not.toHaveBeenCalled();
  });

  it('forwards the nextCursor + baseVariables + merge updateQuery to fetchMore', async () => {
    const { fn, calls } = makeFetchMore(async () => makeBundle([], {}));
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-7',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({
        pageInfo,
        fetchMore: fn as never,
        baseVariables: { limit: 20, sort: 'newest' },
      }),
    );

    await act(async () => {
      result.current.loadMore();
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].variables).toEqual({
      limit: 20,
      sort: 'newest',
      cursor: 'cursor-7',
    });
    expect(typeof calls[0].updateQuery).toBe('function');
  });

  it('updateQuery appends fetched items to the previous page', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-2',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    let mergeFn: ((prev: unknown, opts: { fetchMoreResult: unknown }) => unknown) | null = null;
    fetchMore.mockImplementation(async (opts) => {
      mergeFn = opts.updateQuery;
      return {};
    });

    act(() => result.current.loadMore());

    const previous = makeBundle(
      [{ quizId: 'a' }, { quizId: 'b' }],
      { hasNextPage: true, nextCursor: 'cursor-2', limit: 20 },
    );
    const next = makeBundle(
      [{ quizId: 'c' }, { quizId: 'd' }],
      { hasNextPage: false, nextCursor: null, limit: 20 },
    );

    const merged = mergeFn!(previous, { fetchMoreResult: next });
    expect(merged).toEqual({
      ...next,
      quizzesBundle: {
        ...next.quizzesBundle,
        items: [
          { quizId: 'a' },
          { quizId: 'b' },
          { quizId: 'c' },
          { quizId: 'd' },
        ],
      },
    });
  });

  it('updateQuery returns previous unchanged when fetchMoreResult is missing', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-2',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    let mergeFn: ((prev: unknown, opts: { fetchMoreResult: unknown }) => unknown) | null = null;
    fetchMore.mockImplementation(async (opts) => {
      mergeFn = opts.updateQuery;
      return {};
    });

    act(() => result.current.loadMore());

    const previous = makeBundle(
      [{ quizId: 'a' }],
      { hasNextPage: true, nextCursor: 'cursor-2', limit: 20 },
    );
    expect(mergeFn!(previous, { fetchMoreResult: undefined })).toBe(previous);
    expect(mergeFn!(previous, { fetchMoreResult: null })).toBe(previous);
  });

  it('updateQuery returns previous unchanged when either bundle is missing', () => {
    const fetchMore = vi.fn();
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-2',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    let mergeFn: ((prev: unknown, opts: { fetchMoreResult: unknown }) => unknown) | null = null;
    fetchMore.mockImplementation(async (opts) => {
      mergeFn = opts.updateQuery;
      return {};
    });

    act(() => result.current.loadMore());

    const previous = makeBundle([{ quizId: 'a' }], { hasNextPage: true, nextCursor: 'cursor-2', limit: 20 });
    const missingBundle: Record<string, unknown> = {};
    expect(mergeFn!(previous, { fetchMoreResult: missingBundle })).toBe(previous);
    const missingPrev: Record<string, unknown> = { quizzesBundle: null };
    expect(mergeFn!(missingPrev, { fetchMoreResult: previous })).toBe(missingPrev);
  });

  it('isLoadingMore flips during the in-flight call and resolves back to false', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    const fetchMore = vi.fn(
      async () => new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-3',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    expect(result.current.isLoadingMore).toBe(false);
    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);

    await act(async () => {
      resolveFetch(makeBundle([{ quizId: 'e' }], { hasNextPage: false, nextCursor: null, limit: 20 }));
    });

    expect(result.current.isLoadingMore).toBe(false);
  });

  it('drops a second loadMore call while a request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    const fetchMore = vi.fn(
      async () => new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-4',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    act(() => result.current.loadMore());
    act(() => result.current.loadMore());
    expect(fetchMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(makeBundle([], { hasNextPage: false, nextCursor: null, limit: 20 }));
    });
  });

  it('captures a rejected fetchMore as an ApiError on the result.error', async () => {
    const fetchMore = vi.fn(async () => {
      throw new Error('boom');
    });
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-5',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    await act(async () => {
      result.current.loadMore();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('reset() clears the error and the loading flag', async () => {
    const fetchMore = vi.fn(async () => {
      throw new Error('oops');
    });
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-6',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    await act(async () => {
      result.current.loadMore();
    });
    expect(result.current.error).not.toBeNull();

    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
    expect(result.current.isLoadingMore).toBe(false);
  });
});

describe('useQuizzesLoadMore — isolation between renders', () => {
  it('clears isLoadingMore after a rejected loadMore resolves back to idle', async () => {
    const fetchMore = vi.fn(async () => {
      throw new Error('first-call-boom');
    });
    const pageInfo: QuizzesBundlePageInfo = {
      hasNextPage: true,
      limit: 20,
      nextCursor: 'cursor-stable',
    };

    const { result } = renderHook(() =>
      useQuizzesLoadMore({ pageInfo, fetchMore, baseVariables: {} }),
    );

    await act(async () => {
      result.current.loadMore();
    });
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.error).not.toBeNull();
  });
});
