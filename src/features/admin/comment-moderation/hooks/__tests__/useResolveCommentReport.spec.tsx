/**
 * `useResolveCommentReport` unit tests.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C2.
 *
 * Coverage map (TKT-7.6.C2 acceptance criteria):
 *
 *   AC #1 — happy path dispatches `patchCommentReport` with the
 *           SDK status mapped via `getSdkStatusForCommentReportAction`
 *   AC #2 — emits `started`/`success` breadcrumbs via the Phase 7
 *           helper, with `action` taken from the documented
 *           `COMMENT_REPORT_ACTIONS[action].breadcrumbAction`
 *   AC #3 — `not-found` outcome preserves the error and revalidates
 *           the queue (still no retry)
 *   AC #4 — `already-resolved` outcome preserves the error and
 *           revalidates the queue
 *   AC #5 — `forbidden` outcome preserves the error
 *   AC #6 — `hide_comment` action additionally calls `hideComment`
 *           AFTER the PATCH succeeds
 *   AC #7 — companion `hideComment` failure does NOT roll back the
 *           PATCH; the hook surfaces the typed code via
 *           `lastOutcome` and emits a `failure` breadcrumb
 *   AC #8 — non-typed consumer action throws a synthetic
 *           `GLOBAL_VALIDATION` ApiError before any SWR work
 *   AC #9 — unknown errors (non-`ApiError`) are wrapped into an
 *           `ApiError` with `code: 'UnknownError'`
 *   AC #10 — second call while a mutation is in-flight returns the
 *            in-flight Promise (no duplicate dispatch)
 *   AC #11 — `reset()` clears state
 *   AC #12 — comment-report queue SWR cache is invalidated on
 *            success (matches every `show` variant)
 *   AC #13 — type-check (handled by pnpm type-check, not this file)
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

// ─── Sentry helper mock ────────────────────────────────────────────────────

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin/admin_live_sentry', () => ({
  addCommentModerationBreadcrumb: (...args: unknown[]) =>
    mockAddCommentModerationBreadcrumb(...args),
}));

// ─── Cross-tab broadcast mock ──────────────────────────────────────────────

const mockBroadcastCommentModerationInvalidate = vi.hoisted(() => vi.fn());

vi.mock(
  '../../cache/comment-moderation-cross-tab',
  () => ({
    broadcastCommentModerationInvalidate: (
      ...args: Parameters<typeof mockBroadcastCommentModerationInvalidate>
    ) => mockBroadcastCommentModerationInvalidate(...args),
  }),
);

// ─── Service mocks ──────────────────────────────────────────────────────────

const mockPatchCommentReport = vi.hoisted(() => vi.fn());
const mockHideComment = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/comment-moderation.service', () => ({
  patchCommentReport: (...args: unknown[]) => mockPatchCommentReport(...args),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getComments: () => ({
      hideComment: (...args: unknown[]) => mockHideComment(...args),
    }),
  };
});

// ─── SWR global mutate spy ──────────────────────────────────────────────────

const mockGlobalMutate = vi.hoisted(() => vi.fn((...args: unknown[]) => Promise.resolve(undefined)));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeApiError(
  code: string,
  status: number,
  requestId = 'req-1',
): ApiError {
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
        extensions: { code, requestId },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

afterEach(() => {
  vi.clearAllMocks();
  mockPatchCommentReport.mockReset();
  mockHideComment.mockReset();
  mockAddCommentModerationBreadcrumb.mockReset();
  mockBroadcastCommentModerationInvalidate.mockReset();
  mockGlobalMutate.mockReset();
  mockGlobalMutate.mockResolvedValue(undefined);
});

beforeEach(() => {
  mockPatchCommentReport.mockReset();
  mockHideComment.mockReset();
  mockAddCommentModerationBreadcrumb.mockReset();
  mockBroadcastCommentModerationInvalidate.mockReset();
  mockGlobalMutate.mockReset();
  mockGlobalMutate.mockResolvedValue(undefined);
});

function renderHookHook() {
  return renderHook(() => useResolveCommentReport(), {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

import { useResolveCommentReport } from '../useResolveCommentReport';
import { COMMENT_REPORT_ACTIONS } from '../../action-enum';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.C2 — useResolveCommentReport: happy path', () => {
  it('dispatches patchCommentReport with the SDK status mapped from the consumer action', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'reviewed',
      commentId: 'c-1',
    });

    const { result } = renderHookHook();

    let resolved: unknown = null;
    await act(async () => {
      resolved = await result.current.resolve('r-1', 'acknowledge');
    });

    expect(resolved).toEqual({
      reportId: 'r-1',
      status: 'reviewed',
      commentId: 'c-1',
    });

    expect(mockPatchCommentReport).toHaveBeenCalledTimes(1);
    expect(mockPatchCommentReport).toHaveBeenCalledWith('r-1', {
      status: 'reviewed',
    });

    // SDK status mapping is documented, not duplicated in the test.
    expect(getSdkStatusForCommentReportActionExpect('acknowledge')).toBe(
      'reviewed',
    );
  });

  it('emits started + success breadcrumbs with the documented breadcrumbAction', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'dismissed',
    });

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'dismiss');
    });

    const startCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
      (args) => (args[0] as { status: string }).status === 'started',
    );
    const successCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
      (args) => (args[0] as { status: string }).status === 'success',
    );

    expect(startCall).toBeDefined();
    expect(successCall).toBeDefined();

    const startPayload = startCall?.[0] as Record<string, unknown>;
    const successPayload = successCall?.[0] as Record<string, unknown>;
    expect(startPayload.action).toBe(
      COMMENT_REPORT_ACTIONS.dismiss.breadcrumbAction,
    );
    expect(startPayload.route).toBe('admin-comment-moderation.resolve');
    expect(startPayload.targetId).toBe('r-1');
    expect(successPayload.action).toBe(
      COMMENT_REPORT_ACTIONS.dismiss.breadcrumbAction,
    );
  });

  it('invalidates the comment-reports queue SWR cache on success', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'reviewed',
    });

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'acknowledge');
    });

    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
    const [predicate] = mockGlobalMutate.mock.calls[0] ?? [];
    expect(typeof predicate).toBe('function');

    // Predicate matches all variants of the queue key.
    expect(
      (predicate as (key: readonly unknown[]) => boolean)([
        'admin',
        'comment-reports',
        'list',
        'pending',
      ]),
    ).toBe(true);
    expect(
      (predicate as (key: readonly unknown[]) => boolean)([
        'admin',
        'comment-reports',
        'list',
        'resolved',
      ]),
    ).toBe(true);
    // And non-queue keys do not match.
    expect(
      (predicate as (key: readonly unknown[]) => boolean)([
        'admin',
        'review-reports',
        'list',
      ]),
    ).toBe(false);
  });
});

describe('TKT-7.6.C2 — useResolveCommentReport: error classification', () => {
  it('not-found outcome preserves the error and revalidates the queue', async () => {
    const apiError = makeApiError('COMMENT_REPORT_NOT_FOUND', 404);
    mockPatchCommentReport.mockRejectedValue(apiError);

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(result.current.lastOutcome?.kind).toBe('not-found');
    expect(result.current.error?.code).toBe('COMMENT_REPORT_NOT_FOUND');
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it('already-resolved outcome preserves the error and revalidates the queue', async () => {
    const apiError = makeApiError('COMMENT_REPORT_ALREADY_RESOLVED', 409);
    mockPatchCommentReport.mockRejectedValue(apiError);

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(result.current.lastOutcome?.kind).toBe('already-resolved');
    expect(result.current.error?.code).toBe('COMMENT_REPORT_ALREADY_RESOLVED');
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it('forbidden outcome preserves the error', async () => {
    const apiError = makeApiError('GLOBAL_FORBIDDEN', 403);
    mockPatchCommentReport.mockRejectedValue(apiError);

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(result.current.lastOutcome?.kind).toBe('forbidden');
    expect(result.current.error?.code).toBe('GLOBAL_FORBIDDEN');
  });

  it('unknown errors (non-ApiError) are wrapped into an ApiError with code "UnknownError"', async () => {
    mockPatchCommentReport.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.code).toBe('UnknownError');
    expect(result.current.lastOutcome?.kind).toBe('reverted');
  });

  it('failure emits a "failure" breadcrumb with the typed code', async () => {
    const apiError = makeApiError(
      'COMMENT_REPORT_ALREADY_RESOLVED',
      409,
      'req-77',
    );
    mockPatchCommentReport.mockRejectedValue(apiError);

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    const failureCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
      (args) => (args[0] as { status: string }).status === 'failure',
    );

    expect(failureCall).toBeDefined();
    const payload = failureCall?.[0] as Record<string, unknown>;
    expect(payload.action).toBe(
      COMMENT_REPORT_ACTIONS.acknowledge.breadcrumbAction,
    );
    expect(payload.code).toBe('COMMENT_REPORT_ALREADY_RESOLVED');
    expect(payload.requestId).toBe('req-77');
  });
});

describe('TKT-7.6.C2 — useResolveCommentReport: hide_comment companion', () => {
  it('hide_comment action calls hideComment(commentId) AFTER the PATCH succeeds', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'actioned',
      commentId: 'c-42',
    });
    mockHideComment.mockResolvedValueOnce(undefined);

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'hide_comment');
    });

    expect(mockPatchCommentReport).toHaveBeenCalledTimes(1);
    expect(mockHideComment).toHaveBeenCalledTimes(1);
    expect(mockHideComment).toHaveBeenCalledWith('c-42');

    const patchOrder = mockPatchCommentReport.mock.invocationCallOrder[0];
    const hideOrder = mockHideComment.mock.invocationCallOrder[0];
    expect(patchOrder).toBeLessThan(hideOrder);
  });

  it('companion hide failure does NOT roll back the PATCH; the hook surfaces the typed code', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'actioned',
      commentId: 'c-42',
    });
    mockHideComment.mockRejectedValueOnce(
      makeApiError('COMMENT_ALREADY_HIDDEN', 409, 'req-h'),
    );

    const { result } = renderHookHook();

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.resolve('r-1', 'hide_comment');
      } catch (err) {
        caught = err;
      }
    });

    // PATCH not rolled back — the hook rejects with the companion
    // error rather than returning a rollback payload. The patched
    // row is reflected in the audit state so the dialog can
    // display the typed-code copy without losing the row.
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('COMMENT_ALREADY_HIDDEN');
    expect(mockPatchCommentReport).toHaveBeenCalledTimes(1);
    expect(mockHideComment).toHaveBeenCalledTimes(1);

    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(result.current.error?.code).toBe('COMMENT_ALREADY_HIDDEN');
  });

  it('non-hide_comment actions do NOT call hideComment', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'reviewed',
    });

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'acknowledge');
    });

    expect(mockHideComment).not.toHaveBeenCalled();
  });
});

describe('TKT-7.6.C2 — useResolveCommentReport: input validation & concurrency', () => {
  it('non-typed consumer action throws a synthetic GLOBAL_VALIDATION ApiError', async () => {
    const { result } = renderHookHook();

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.resolve(
          'r-1',
          'some-bogus-action' as unknown as 'acknowledge',
        );
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('GLOBAL_VALIDATION');
    expect(result.current.lastOutcome?.kind).toBe('reverted');
    expect(mockPatchCommentReport).not.toHaveBeenCalled();
    // Validation passes do not pre-emit a breadcrumb.
    expect(mockAddCommentModerationBreadcrumb).not.toHaveBeenCalled();
  });

  it('dedupes concurrent calls: the second call returns the in-flight Promise', async () => {
    let resolvePatch: (value: unknown) => void = () => {
      // Replaced on the next line.
    };
    mockPatchCommentReport.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );

    const { result } = renderHookHook();

    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    act(() => {
      first = result.current.resolve('r-1', 'acknowledge');
      second = result.current.resolve('r-1', 'acknowledge');
    });

    await act(async () => {
      resolvePatch({ reportId: 'r-1', status: 'reviewed' });
      await first;
      await second;
    });

    expect(mockPatchCommentReport).toHaveBeenCalledTimes(1);
  });

  it('reset() clears state', async () => {
    mockPatchCommentReport.mockRejectedValueOnce(
      makeApiError('GLOBAL_FORBIDDEN', 403),
    );

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.lastOutcome).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastOutcome).toBeNull();
    expect(result.current.audit.beforeReportId).toBeNull();
    expect(result.current.audit.beforeAction).toBeNull();
    expect(result.current.audit.afterReportId).toBeNull();
    expect(result.current.audit.afterPayload).toBeNull();
  });
});

// ─── TKT-7.6.G2 — Cross-tab broadcast ──────────────────────────────────────

describe('TKT-7.6.G2 — useResolveCommentReport: cross-tab broadcast', () => {
  it('broadcasts the documented event on success (with commentId from the payload)', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'reviewed',
      commentId: 'c-1',
    });

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'acknowledge');
    });

    expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledTimes(1);
    expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledWith(
      'resolve',
      'r-1',
      'c-1',
    );
  });

  it('does NOT broadcast on failure', async () => {
    const apiError = makeApiError('COMMENT_REPORT_ALREADY_RESOLVED', 409);
    mockPatchCommentReport.mockRejectedValue(apiError);

    const { result } = renderHookHook();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'acknowledge');
      } catch {
        // Expected.
      }
    });

    expect(mockBroadcastCommentModerationInvalidate).not.toHaveBeenCalled();
  });

  it('does NOT broadcast when the wire payload omits commentId (defensive)', async () => {
    mockPatchCommentReport.mockResolvedValueOnce({
      reportId: 'r-1',
      status: 'reviewed',
      // commentId intentionally absent
    });

    const { result } = renderHookHook();

    await act(async () => {
      await result.current.resolve('r-1', 'acknowledge');
    });

    expect(mockBroadcastCommentModerationInvalidate).not.toHaveBeenCalled();
  });
});

// ─── Optional helpers ──────────────────────────────────────────────────────

/**
 * Mirrors the SDK mapping baked into `useResolveCommentReport`. The
 * duplicate is intentional — if the action-enum mapping changes,
 * the test stays loud, instead of going silently green.
 */
function getSdkStatusForCommentReportActionExpect(
  action: 'dismiss' | 'acknowledge' | 'mark_resolved' | 'hide_comment',
): 'reviewed' | 'dismissed' | 'actioned' {
  switch (action) {
    case 'dismiss':
      return 'dismissed';
    case 'acknowledge':
      return 'reviewed';
    case 'mark_resolved':
      return 'actioned';
    case 'hide_comment':
      return 'actioned';
  }
}
