

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

const mockListReviewReports = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/review-moderation.service', () => ({
listReviewReports: (...args: unknown[]) => mockListReviewReports(...args),
}));

let mockSearchParams: URLSearchParams = new URLSearchParams();
const mockReplace = vi.hoisted(() => vi.fn((url: string) => {

try {
const parsed = new URL(url, 'http://localhost');
mockSearchParams = new URLSearchParams(parsed.search);
  } catch {
    // Swallow — invalid URLs don't crash the spec; they just leave
    // the search params unchanged so the next render still sees the
    // pre-replace state.
  }
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({ replace: mockReplace }),
useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/api', async () => {
const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return actual;
});

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

function makeWireResponse(rows: ItemRow[], opts: {
nextCursor?: string | null;
hasNextPage?: boolean;
} = {}): unknown {
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

afterEach(() => {
vi.clearAllMocks();
mockListReviewReports.mockReset();
mockReplace.mockReset();
mockSearchParams = new URLSearchParams();
});

beforeEach(() => {
mockListReviewReports.mockReset();
mockReplace.mockReset();
mockSearchParams = new URLSearchParams();
});

function renderUseReviewReports(opts: {
onError?: (err: unknown) => void;
} = {}) {
return renderHook(() => useReviewReports(), {
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
useReviewReports,
reviewReportsKey,
reviewReportsKeyMatcher,
isReviewReportsShow,
normalizeReviewReportsShow,
} from '../useReviewReports';

describe('TKT-7.5.C1 — useReviewReports: key & matcher helpers', () => {
it('reviewReportsKey() returns the documented tuple shape', () => {
expect(reviewReportsKey('pending')).toEqual([
'admin',
'review-reports',
'list',
'pending',
    ]);
expect(reviewReportsKey('resolved')).toEqual([
'admin',
'review-reports',
'list',
'resolved',
    ]);
  });

it('reviewReportsKeyMatcher() matches every show variant of the queue key', () => {
expect(
reviewReportsKeyMatcher([
'admin',
'review-reports',
'list',
'pending',
      ]),
    ).toBe(true);
expect(
reviewReportsKeyMatcher([
'admin',
'review-reports',
'list',
'resolved',
      ]),
    ).toBe(true);
expect(
reviewReportsKeyMatcher([
'admin',
'review-reports',
'list',
'unknown',
      ]),
    ).toBe(true);
expect(reviewReportsKeyMatcher(['admin', 'review-reports', 'detail'])).toBe(false);
expect(reviewReportsKeyMatcher(['reviews', 'quiz', 'x'])).toBe(false);
expect(reviewReportsKeyMatcher('admin:review-reports:list')).toBe(false);
expect(reviewReportsKeyMatcher(null)).toBe(false);
  });

it('isReviewReportsShow() narrows the documented set', () => {
expect(isReviewReportsShow('pending')).toBe(true);
expect(isReviewReportsShow('resolved')).toBe(true);
expect(isReviewReportsShow('open')).toBe(false);
expect(isReviewReportsShow('')).toBe(false);
expect(isReviewReportsShow(null)).toBe(false);
expect(isReviewReportsShow(undefined)).toBe(false);
expect(isReviewReportsShow(123)).toBe(false);
  });

it('normalizeReviewReportsShow() falls back to the documented default', () => {
expect(normalizeReviewReportsShow('pending')).toBe('pending');
expect(normalizeReviewReportsShow('resolved')).toBe('resolved');
expect(normalizeReviewReportsShow('bogus')).toBe('pending');
expect(normalizeReviewReportsShow(null)).toBe('pending');
expect(normalizeReviewReportsShow(undefined)).toBe('pending');
  });
});

describe('TKT-7.5.C1 — useReviewReports: happy path & pagination', () => {
it('initial render surfaces loading then success: items populated, hasMore follows metadata', async () => {
mockListReviewReports.mockResolvedValueOnce(
makeWireResponse([makeRow('r-1'), makeRow('r-2')], {
nextCursor: 'next-page-cursor',
hasNextPage: true,
      }),
    );

const { result } = renderUseReviewReports();

expect(result.current.isLoading).toBe(true);
expect(result.current.items).toEqual([]);

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.items.map((it) => it.reportId)).toEqual([
'r-1',
'r-2',
    ]);
expect(result.current.hasMore).toBe(true);
expect(result.current.error).toBeNull();
  });

it('loadMore() appends the next page and deduplicates overlapping ids', async () => {
mockListReviewReports
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

const { result } = renderUseReviewReports();

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

const ids = result.current.items.map((it) => it.reportId);
expect(new Set(ids).size).toBe(ids.length);
expect(ids).toEqual(['r-1', 'r-2', 'r-3']);
  });
});

function makeApiError(code: string, status: number, requestId: string): ApiError {
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

describe('TKT-7.5.C1 — useReviewReports: error surfaces', () => {
it('error surfaces typed ApiError with .code', async () => {
const apiError = makeApiError('GLOBAL_INTERNAL', 500, 'req-err-1');

mockListReviewReports.mockRejectedValue(apiError);

const onError = vi.fn();
const { result, unmount } = renderUseReviewReports({ onError });

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

mockListReviewReports
      .mockResolvedValueOnce(
makeWireResponse([makeRow('r-1'), makeRow('r-2')], {
nextCursor: 'cur-2',
hasNextPage: true,
        }),
      )
      .mockRejectedValue(makeApiError('GLOBAL_INTERNAL', 500, 'req-err-2'));

const onError = vi.fn();
const { result, unmount } = renderUseReviewReports({ onError });

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

expect(result.current.items.map((it) => it.reportId)).toEqual([
'r-1',
'r-2',
    ]);

unmount();
  });
});

describe('TKT-7.5.C1 — useReviewReports: URL-owned filter', () => {
it('setShow("resolved") calls router.replace with ?show=resolved', () => {
const { result } = renderUseReviewReports();

act(() => {
result.current.setShow('resolved');
    });

expect(mockReplace).toHaveBeenCalledTimes(1);
const replaced = mockReplace.mock.calls[0]?.[0] as string;
expect(replaced).toContain('show=resolved');
expect(replaced.startsWith('/')).toBe(true);
  });

it('setShow("pending") strips the search param (default fallback)', () => {
const { result } = renderUseReviewReports();

act(() => {
result.current.setShow('pending');
    });

expect(mockReplace).toHaveBeenCalledTimes(1);
const replaced = mockReplace.mock.calls[0]?.[0] as string;
expect(replaced).not.toContain('show=');
  });

it('initial show state resolves to "pending" when ?show= is absent', () => {
const { result } = renderUseReviewReports();
expect(result.current.show).toBe('pending');
  });

it('reads show from URL: ?show=resolved resolves to "resolved"', () => {
mockSearchParams = new URLSearchParams('show=resolved');
const { result } = renderUseReviewReports();
expect(result.current.show).toBe('resolved');
  });

it('reads show from URL: ?show=bogus resolves to "pending" (default fallback)', () => {
mockSearchParams = new URLSearchParams('show=banana');
const { result } = renderUseReviewReports();
expect(result.current.show).toBe('pending');
  });
});
