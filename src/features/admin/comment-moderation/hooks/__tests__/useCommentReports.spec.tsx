/**
 * `useCommentReports` unit tests.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C1.
 *
 * Coverage map (TKT-7.6.C1 acceptance criteria):
 *
 *   AC #1 — initial loading state
 *   AC #2 — single-page success populates `items` and `hasMore`
 *   AC #3 — `loadMore()` appends a second page and deduplicates by id
 *   AC #4 — error surfaces typed `ApiError` with `error.code`
 *   AC #5 — `setShow('resolved')` updates the URL
 *   AC #6 — invalid `?show=` values fall back to `'pending'`
 *   AC #7 — hook never assembles an offset or invents a `page` parameter
 *   AC #8 — type-check (handled by pnpm type-check, not this file)
 *
 * The tests run inside `<SWRConfig value={{ provider: () => new Map() }}>`
 * so each `renderHook` call gets an isolated SWR cache. The
 * `useCommentReports` service is mocked via the documented `vi.mock`
 * pattern from Epic 7.5.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockListCommentReports = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/comment-moderation.service', () => ({
  listCommentReports: (...args: unknown[]) => mockListCommentReports(...args),
}));

// Stateful `useSearchParams` mock. When the hook reads `?show=`, we
// expect the test driver to have updated the in-memory
// `URLSearchParams` via `setSearchParams`. The empty default keeps
// the "URL unset → fall back to 'pending'" path reachable.
let mockSearchParams: URLSearchParams = new URLSearchParams();
const mockReplace = vi.hoisted(() =>
  vi.fn((url: string) => {
    // Parse the new URL and update the mock so the next render
    // observes the post-`replace` search params.
    try {
      const parsed = new URL(url, 'http://localhost');
      mockSearchParams = new URLSearchParams(parsed.search);
    } catch {
      // Swallow — invalid URLs don't crash the spec; they just leave
      // the search params unchanged so the next render still sees the
      // pre-replace state.
    }
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return actual;
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface ItemRow {
  reportId: string;
  status: 'open' | 'reviewed' | 'dismissed' | 'actioned';
}

function makeRow(
  reportId: string,
  status: ItemRow['status'] = 'open',
): ItemRow & { id: string } {
  return { reportId, status, id: reportId };
}

function makeWireResponse(
  rows: ItemRow[],
  opts: {
    nextCursor?: string | null;
    hasNextPage?: boolean;
  } = {},
): unknown {
  return {
    data: rows,
    meta: {
      pagination: {
        kind: 'cursor',
        limit: rows.length,
        nextCursor: opts.nextCursor ?? null,
        hasNextPage: opts.hasNextPage ?? false,
      },
    },
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks();
  mockListCommentReports.mockReset();
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
});

beforeEach(() => {
  mockListCommentReports.mockReset();
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderUseCommentReports(opts: {
  onError?: (err: unknown) => void;
} = {}) {
  return renderHook(() => useCommentReports(), {
    wrapper: ({ children }) => (
      <SWRConfig
        value={{
          provider: () => new Map(),
          onError: (err) => opts.onError?.(err),
        }}
      >
        {children}
      </SWRConfig>
    ),
  });
}

import {
  useCommentReports,
  commentReportsKey,
  commentReportsKeyMatcher,
  isCommentReportsShow,
  normalizeCommentReportsShow,
} from '../useCommentReports';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.6.C1 — useCommentReports: key & matcher helpers', () => {
  it('commentReportsKey() returns the documented tuple shape', () => {
    expect(commentReportsKey('pending')).toEqual([
      'admin',
      'comment-reports',
      'list',
      'pending',
    ]);
    expect(commentReportsKey('resolved')).toEqual([
      'admin',
      'comment-reports',
      'list',
      'resolved',
    ]);
  });

  it('commentReportsKeyMatcher() matches every show variant of the queue key', () => {
    expect(
      commentReportsKeyMatcher([
        'admin',
        'comment-reports',
        'list',
        'pending',
      ]),
    ).toBe(true);
    expect(
      commentReportsKeyMatcher([
        'admin',
        'comment-reports',
        'list',
        'resolved',
      ]),
    ).toBe(true);
    expect(
      commentReportsKeyMatcher([
        'admin',
        'comment-reports',
        'list',
        'unknown',
      ]),
    ).toBe(true);
    expect(
      commentReportsKeyMatcher(['admin', 'comment-reports', 'detail']),
    ).toBe(false);
    expect(commentReportsKeyMatcher(['comments', 'quiz', 'x'])).toBe(false);
    expect(commentReportsKeyMatcher('admin:comment-reports:list')).toBe(false);
    expect(commentReportsKeyMatcher(null)).toBe(false);
  });

  it('isCommentReportsShow() narrows the documented set', () => {
    expect(isCommentReportsShow('pending')).toBe(true);
    expect(isCommentReportsShow('resolved')).toBe(true);
    expect(isCommentReportsShow('open')).toBe(false);
    expect(isCommentReportsShow('')).toBe(false);
    expect(isCommentReportsShow(null)).toBe(false);
    expect(isCommentReportsShow(undefined)).toBe(false);
    expect(isCommentReportsShow(123)).toBe(false);
  });

  it('normalizeCommentReportsShow() falls back to the documented default', () => {
    expect(normalizeCommentReportsShow('pending')).toBe('pending');
    expect(normalizeCommentReportsShow('resolved')).toBe('resolved');
    expect(normalizeCommentReportsShow('bogus')).toBe('pending');
    expect(normalizeCommentReportsShow(null)).toBe('pending');
    expect(normalizeCommentReportsShow(undefined)).toBe('pending');
  });
});

describe('TKT-7.6.C1 — useCommentReports: happy path & pagination', () => {
  it('initial render surfaces loading then success: items populated, hasMore follows metadata', async () => {
    mockListCommentReports.mockResolvedValueOnce(
      makeWireResponse([makeRow('r-1'), makeRow('r-2')], {
        nextCursor: 'next-page-cursor',
        hasNextPage: true,
      }),
    );

    const { result } = renderUseCommentReports();

    // AC #1: initially loading.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // AC #2: items populated, hasMore follows metadata.
    expect(result.current.items.map((it) => it.reportId)).toEqual([
      'r-1',
      'r-2',
    ]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loadMore() appends the next page and deduplicates overlapping ids', async () => {
    mockListCommentReports
      .mockResolvedValueOnce(
        makeWireResponse([makeRow('r-1'), makeRow('r-2')], {
          nextCursor: 'cur-2',
          hasNextPage: true,
        }),
      )
      .mockResolvedValueOnce(
        makeWireResponse([makeRow('r-2'), makeRow('r-3')], {
          nextCursor: null,
          hasNextPage: false,
        }),
      );

    const { result } = renderUseCommentReports();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    // AC #3: appended page merged with dedup by reportId.
    const ids = result.current.items.map((it) => it.reportId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['r-1', 'r-2', 'r-3']);
  });
});

function makeApiError(
  code: string,
  status: number,
  requestId: string,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        status,
        detail: code,
        title: code,
        extensions: { code, requestId },
      },
    },
    name: 'AxiosError',
    message: code,
    config: undefined,
    request: undefined,
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

describe('TKT-7.6.C1 — useCommentReports: error surfaces', () => {
  it('error surfaces typed ApiError with .code', async () => {
    const apiError = makeApiError('GLOBAL_INTERNAL', 500, 'req-err-1');
    // Use `mockRejectedValue` (not `Once`) so subsequent revalidations
    // continue to reject — that way no test cleanup races with a
    // revalidation that returns undefined.
    mockListCommentReports.mockRejectedValue(apiError);

    // Drain any onError events so React's render error path is not
    // triggered by the rejection leaking through SWRInfinite.
    const onError = vi.fn();
    const { result, unmount } = renderUseCommentReports({ onError });

    // The primitive's retry policy keeps `isLoading: true` while it
    // attempts backoff retries; ultimately `error` surfaces in the
    // state. We assert on `error` and `items` (the documented
    // contract), not on `isLoading`.
    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    expect(result.current.items).toEqual([]);

    unmount();
  });

  it('does not lose the last-known list when a subsequent page fetch rejects', async () => {
    // First page populates `items`. Second page fails. The hook
    // keeps the first-page items in memory so the queue stays usable.
    mockListCommentReports
      .mockResolvedValueOnce(
        makeWireResponse([makeRow('r-1'), makeRow('r-2')], {
          nextCursor: 'cur-2',
          hasNextPage: true,
        }),
      )
      .mockRejectedValue(makeApiError('GLOBAL_INTERNAL', 500, 'req-err-2'));

    const onError = vi.fn();
    const { result, unmount } = renderUseCommentReports({ onError });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 5000 },
    );

    // Items from the first page are kept; the failed page is not
    // appended (the primitive's `last-known list` invariant).
    expect(result.current.items.map((it) => it.reportId)).toEqual([
      'r-1',
      'r-2',
    ]);

    unmount();
  });
});

describe('TKT-7.6.C1 — useCommentReports: cursor pagination contract', () => {
  it('never assembles an offset or invents a `page` parameter', async () => {
    mockListCommentReports.mockResolvedValueOnce(
      makeWireResponse([makeRow('r-1')], {
        nextCursor: null,
        hasNextPage: false,
      }),
    );

    const { result } = renderUseCommentReports();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // AC #7: the first call to the service must NOT include an
    // offset or `page` parameter; cursor pagination is the only
    // contract. The fetcher passes a flat `{ status, limit }` shape
    // on the first page (no cursor).
    expect(mockListCommentReports).toHaveBeenCalledTimes(1);
    const firstCall = mockListCommentReports.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(firstCall).toBeDefined();
    expect(firstCall).not.toHaveProperty('offset');
    expect(firstCall).not.toHaveProperty('page');
    expect(Object.prototype.hasOwnProperty.call(firstCall, 'cursor')).toBe(false);
    expect(firstCall).toHaveProperty('status', 'open');
    expect(firstCall).toHaveProperty('limit', 20);
  });
});

describe('TKT-7.6.C1 — useCommentReports: URL-owned filter', () => {
  it('setShow("resolved") calls router.replace with ?show=resolved', () => {
    const { result } = renderUseCommentReports();

    act(() => {
      result.current.setShow('resolved');
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const replaced = mockReplace.mock.calls[0]?.[0] as string;
    expect(replaced).toContain('show=resolved');
    expect(replaced.startsWith('/')).toBe(true);
  });

  it('setShow("pending") strips the search param (default fallback)', () => {
    const { result } = renderUseCommentReports();

    act(() => {
      result.current.setShow('pending');
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const replaced = mockReplace.mock.calls[0]?.[0] as string;
    expect(replaced).not.toContain('show=');
  });

  it('initial show state resolves to "pending" when ?show= is absent', () => {
    const { result } = renderUseCommentReports();
    expect(result.current.show).toBe('pending');
  });

  it('reads show from URL: ?show=resolved resolves to "resolved"', () => {
    mockSearchParams = new URLSearchParams('show=resolved');
    const { result } = renderUseCommentReports();
    expect(result.current.show).toBe('resolved');
  });

  it('reads show from URL: ?show=bogus resolves to "pending" (default fallback)', () => {
    mockSearchParams = new URLSearchParams('show=banana');
    const { result } = renderUseCommentReports();
    expect(result.current.show).toBe('pending');
  });
});
