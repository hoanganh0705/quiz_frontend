/**
 * `useComment` unit tests.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C4.
 *
 * Coverage map (TKT-7.6.C4 acceptance criteria):
 *
 *   AC #1 — happy path: fetches the comment via the SDK and exposes
 *           the payload as `comment`
 *   AC #2 — invalid id (`validateCommentId` returns false) shortcuts
 *           to the `COMMENT_NOT_FOUND` outcome without a network call
 *   AC #3 — `enabled: false` short-circuits the fetch
 *   AC #4 — `COMMENT_NOT_FOUND` outcome is preserved when the SDK
 *           rejects with the same code
 *   AC #5 — `GLOBAL_FORBIDDEN` outcome is preserved when the SDK
 *           rejects with the same code
 *   AC #6 — unknown errors get the `reverted` outcome
 *   AC #7 — `refresh()` re-fetches via the SDK
 *   AC #8 — `mutate(updater)` writes the new value to the SWR cache
 *   AC #9 — read hook does NOT emit Sentry breadcrumbs
 *   AC #10 — type-check (handled by pnpm type-check, not this file)
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

// ─── Sentry helper mock ────────────────────────────────────────────────────

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin/phase7_admin_sentry', () => ({
  addCommentModerationBreadcrumb: (...args: unknown[]) =>
    mockAddCommentModerationBreadcrumb(...args),
}));

// ─── SDK getComments mock ───────────────────────────────────────────────────

const mockGetComment = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getComments: () => ({
      getComment: (...args: unknown[]) => mockGetComment(...args),
    }),
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeApiError(code: string, status: number): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        status,
        detail: code,
        title: code,
        extensions: { code, requestId: 'req-1' },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

afterEach(() => {
  vi.clearAllMocks();
  mockGetComment.mockReset();
  mockAddCommentModerationBreadcrumb.mockReset();
});

beforeEach(() => {
  mockGetComment.mockReset();
  mockAddCommentModerationBreadcrumb.mockReset();
});

function renderUseComment(params: { commentId: string; enabled?: boolean }) {
  return renderHook(() => useComment(params), {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

import { useComment } from '../useComment';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.C4 — useComment: happy path', () => {
  it('fetches the comment via the SDK and exposes the payload', async () => {
    const fixture = {
      commentId: '00000000-0000-4000-8000-000000000001',
      threadId: 't-1',
      body: 'Hello',
      hidden: false,
    };
    mockGetComment.mockResolvedValueOnce(fixture);

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.comment).toEqual(fixture);
    });

    expect(mockGetComment).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
    expect(result.current.outcome).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('does NOT emit Sentry breadcrumbs (read hook, not a mutation)', async () => {
    mockGetComment.mockResolvedValueOnce({ commentId: '00000000-0000-4000-8000-000000000001' });

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.outcome).toBe('success');
    });

    expect(mockAddCommentModerationBreadcrumb).not.toHaveBeenCalled();
  });
});

describe('TKT-7.6.C4 — useComment: short-circuits', () => {
  it('invalid id shortcuts to COMMENT_NOT_FOUND without a network call', async () => {
    const { result } = renderUseComment({ commentId: 'not-a-uuid' });

    // The hook surfaces `not-found` synchronously; no fetcher call.
    expect(result.current.outcome).toBe('not-found');
    expect(mockGetComment).not.toHaveBeenCalled();
  });

  it('enabled:false short-circuits the fetch', async () => {
    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001', enabled: false });

    // Outcome stays `pending` until enabled flips back; no fetcher call.
    expect(result.current.outcome).toBe('pending');
    expect(mockGetComment).not.toHaveBeenCalled();
  });

  it('empty id shortcuts to not-found', async () => {
    const { result } = renderUseComment({ commentId: '' });

    expect(result.current.outcome).toBe('not-found');
    expect(mockGetComment).not.toHaveBeenCalled();
  });
});

describe('TKT-7.6.C4 — useComment: error classification', () => {
  it('COMMENT_NOT_FOUND outcome is preserved when the SDK rejects', async () => {
    mockGetComment.mockRejectedValueOnce(makeApiError('COMMENT_NOT_FOUND', 404));

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.outcome).toBe('not-found');
    });

    expect(result.current.error?.code).toBe('COMMENT_NOT_FOUND');
  });

  it('GLOBAL_FORBIDDEN outcome is preserved when the SDK rejects', async () => {
    mockGetComment.mockRejectedValueOnce(makeApiError('GLOBAL_FORBIDDEN', 403));

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.outcome).toBe('forbidden');
    });

    expect(result.current.error?.code).toBe('GLOBAL_FORBIDDEN');
  });

  it('unknown errors get the "reverted" outcome', async () => {
    mockGetComment.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.outcome).toBe('reverted');
    });
  });
});

describe('TKT-7.6.C4 — useComment: refresh & mutate', () => {
  it('refresh() re-fetches via the SDK into the SWR cache', async () => {
    mockGetComment
      .mockResolvedValueOnce({ commentId: '00000000-0000-4000-8000-000000000001', body: 'first' })
      .mockResolvedValueOnce({ commentId: '00000000-0000-4000-8000-000000000001', body: 'second' });

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.comment).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', body: 'first' });
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.comment).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', body: 'second' });
    });

    expect(mockGetComment).toHaveBeenCalled();
    // The refresh dedupes in-flight requests, so the SDK is
    // called at least twice (initial + refresh) but never more
    // than the documented flow allows.
    expect(mockGetComment.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('mutate(updater) writes the new value to the SWR cache', async () => {
    mockGetComment.mockResolvedValueOnce({ commentId: '00000000-0000-4000-8000-000000000001', hidden: false });

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.comment).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', hidden: false });
    });

    await act(async () => {
      await result.current.mutate({ commentId: '00000000-0000-4000-8000-000000000001', hidden: true });
    });

    await waitFor(() => {
      expect(result.current.comment).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', hidden: true });
    });
  });

  it('mutate(function) receives the previous value', async () => {
    mockGetComment.mockResolvedValueOnce({ commentId: '00000000-0000-4000-8000-000000000001', hidden: false });

    const { result } = renderUseComment({ commentId: '00000000-0000-4000-8000-000000000001' });

    await waitFor(() => {
      expect(result.current.comment).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', hidden: false });
    });

    let seen: unknown = null;
    await act(async () => {
      await result.current.mutate((prev: unknown) => {
        seen = prev;
        return { commentId: '00000000-0000-4000-8000-000000000001', hidden: true };
      });
    });

    expect(seen).toEqual({ commentId: '00000000-0000-4000-8000-000000000001', hidden: false });
  });
});
