/**
 * `useResolveReviewReport` unit tests.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.C2.
 *
 * Coverage map (TKT-7.5.C2 acceptance criteria):
 *
 *   AC #1 — success invalidates the queue + reviews SWR caches
 *   AC #2 — `REVIEW_NOT_FOUND` (was: `REVIEW_REPORT_NOT_FOUND`) is surfaced
 *           and never auto-retried; queue is revalidated as a no-op
 *   AC #3 — `GLOBAL_FORBIDDEN` (was: `PERMISSION_DENIED`) is surfaced
 *           and never auto-retried
 *   AC #4 — the hook emits `started` / `success` / `failure` breadcrumbs
 *           via `addReviewModerationBreadcrumb`
 *   AC #5 — the audit snapshot exposes `beforeReportId`,
 *           `beforeAction`, `afterReportId`, `afterPayload`
 *   AC #6 — `reset()` clears `error` / `lastOutcome` and returns to
 *           the idle state
 *   AC #7 — the consumer-side action maps to the SDK `status` value
 *           (e.g. `dismiss` → `'dismissed'`, `delete_review` →
 *           `'actioned'` + companion DELETE)
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { useResolveReviewReport } from '../useResolveReviewReport';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPatchReviewReport = vi.hoisted(() => vi.fn());
const mockAdminDeleteReview = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());
const mockAddReviewModerationBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/review-moderation.service', () => ({
  listReviewReports: vi.fn(),
  patchReviewReport: (...args: unknown[]) => mockPatchReviewReport(...args),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    getReviews: () => ({
      adminReviewControllerAdminDeleteReview: (...args: unknown[]) =>
        mockAdminDeleteReview(...args),
    }),
  };
});

vi.mock('swr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('swr')>();
  return {
    ...actual,
    mutate: (...args: unknown[]) => mockMutate(...args),
  };
});

vi.mock('@/lib/admin/phase7_admin_sentry', () => ({
  addReviewModerationBreadcrumb: (...args: unknown[]) =>
    mockAddReviewModerationBreadcrumb(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function makeUpdatedReport(overrides: Partial<{
  reportId: string;
  status: 'reviewed' | 'dismissed' | 'actioned';
  reviewId: string;
}> = {}) {
  return {
    reportId: overrides.reportId ?? 'r-1',
    reviewId: overrides.reviewId ?? 'review-1',
    quizId: 'q-1',
    quizTitle: 'Sample Quiz',
    reviewerUsername: 'reporter-1',
    reportedUserId: 'author-1',
    rating: 1,
    comment: 'spam',
    reason: 'spam' as const,
    status: overrides.status ?? 'dismissed',
    details: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T01:00:00.000Z',
  };
}

function renderUseResolveReviewReport() {
  return renderHook(() => useResolveReviewReport(), {
    wrapper: ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        {children}
      </SWRConfig>
    ),
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks();
  mockPatchReviewReport.mockReset();
  mockAdminDeleteReview.mockReset();
  mockMutate.mockReset();
  mockAddReviewModerationBreadcrumb.mockReset();
});

beforeEach(() => {
  mockPatchReviewReport.mockReset();
  mockAdminDeleteReview.mockReset();
  mockMutate.mockReset();
  mockAddReviewModerationBreadcrumb.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.5.C2 — useResolveReviewReport: success paths', () => {
  it('resolve("dismiss") sends status="dismissed" and invalidates the queue', async () => {
    mockPatchReviewReport.mockResolvedValueOnce(makeUpdatedReport({ status: 'dismissed' }));

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      await result.current.resolve('r-1', 'dismiss');
    });

    expect(mockPatchReviewReport).toHaveBeenCalledWith(
      'r-1',
      expect.objectContaining({ status: 'dismissed' }),
    );
    // Companion DELETE must NOT fire for reversible / non-destructive actions.
    expect(mockAdminDeleteReview).not.toHaveBeenCalled();
    // SWR cache is revalidated via the predicate matcher (one or
    // more calls during the success path).
    expect(mockMutate).toHaveBeenCalled();
  });

  it('resolve("acknowledge") sends status="reviewed"', async () => {
    mockPatchReviewReport.mockResolvedValueOnce(makeUpdatedReport({ status: 'reviewed' }));

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      await result.current.resolve('r-1', 'acknowledge');
    });

    expect(mockPatchReviewReport).toHaveBeenCalledWith(
      'r-1',
      expect.objectContaining({ status: 'reviewed' }),
    );
  });

  it('resolve("delete_review") fires PATCH + companion DELETE', async () => {
    mockPatchReviewReport.mockResolvedValueOnce(makeUpdatedReport({ status: 'actioned' }));
    mockAdminDeleteReview.mockResolvedValueOnce(undefined);

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      await result.current.resolve('r-1', 'delete_review');
    });

    expect(mockPatchReviewReport).toHaveBeenCalledWith(
      'r-1',
      expect.objectContaining({ status: 'actioned' }),
    );
    expect(mockAdminDeleteReview).toHaveBeenCalledWith('review-1');
  });

  it('audit snapshot surfaces beforeReportId / afterPayload on success', async () => {
    mockPatchReviewReport.mockResolvedValueOnce(makeUpdatedReport({ status: 'dismissed' }));

    const { result } = renderUseResolveReviewReport();

    expect(result.current.audit).toEqual({
      beforeReportId: null,
      beforeAction: null,
      afterReportId: null,
      afterPayload: null,
    });

    await act(async () => {
      await result.current.resolve('r-1', 'dismiss');
    });

    await waitFor(() => {
      expect(result.current.audit.afterReportId).toBe('r-1');
    });

    expect(result.current.audit.beforeReportId).toBe('r-1');
    expect(result.current.audit.beforeAction).toBe('dismiss');
    expect(result.current.audit.afterPayload).not.toBeNull();
  });

  it('emits "started" + "success" breadcrumbs on success', async () => {
    mockPatchReviewReport.mockResolvedValueOnce(makeUpdatedReport({ status: 'dismissed' }));

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      await result.current.resolve('r-1', 'dismiss');
    });

    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'started',
        action: 'review.report.dismiss',
        targetId: 'r-1',
      }),
    );
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        action: 'review.report.dismiss',
        targetId: 'r-1',
      }),
    );
  });

  it('lastOutcome: success branch carries the payload', async () => {
    const updated = makeUpdatedReport({ status: 'dismissed' });
    mockPatchReviewReport.mockResolvedValueOnce(updated);

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      await result.current.resolve('r-1', 'dismiss');
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('success');
    });
    if (result.current.lastOutcome?.kind === 'success') {
      expect(result.current.lastOutcome.payload).toEqual(updated);
      expect(result.current.lastOutcome.cause).toBeNull();
    }
  });
});

describe('TKT-7.5.C2 — useResolveReviewReport: error classification', () => {
  it('classifies REVIEW_NOT_FOUND as lastOutcome.kind="not-found"', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('REVIEW_NOT_FOUND', 404, 'req-404'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected — re-thrown.
      }
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('not-found');
    });
    if (result.current.lastOutcome?.kind === 'not-found') {
      expect(result.current.lastOutcome.cause.code).toBe('REVIEW_NOT_FOUND');
    }
    expect(result.current.error?.code).toBe('REVIEW_NOT_FOUND');
    expect(result.current.error?.requestId).toBe('req-404');
  });

  it('classifies GLOBAL_FORBIDDEN as lastOutcome.kind="forbidden"', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('GLOBAL_FORBIDDEN', 403, 'req-403'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('forbidden');
    });
    if (result.current.lastOutcome?.kind === 'forbidden') {
      expect(result.current.lastOutcome.cause.code).toBe('GLOBAL_FORBIDDEN');
    }
    expect(result.current.error?.code).toBe('GLOBAL_FORBIDDEN');
  });

  it('classifies unknown codes as lastOutcome.kind="reverted"', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('GLOBAL_INTERNAL', 500, 'req-500'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.lastOutcome?.kind).toBe('reverted');
    });
    if (result.current.lastOutcome?.kind === 'reverted') {
      expect(result.current.lastOutcome.cause.code).toBe('GLOBAL_INTERNAL');
    }
  });

  it('emits "failure" breadcrumb with code + requestId on rejection', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('REVIEW_NOT_FOUND', 404, 'req-404-fail'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected
      }
    });

    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        action: 'review.report.dismiss',
        code: 'REVIEW_NOT_FOUND',
        requestId: 'req-404-fail',
      }),
    );
  });

  it('does not auto-retry on REVIEW_NOT_FOUND (single call to patchReviewReport)', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('REVIEW_NOT_FOUND', 404, 'req-once'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected
      }
    });

    expect(mockPatchReviewReport).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.5.C2 — useResolveReviewReport: state management', () => {
  it('reset() clears error, lastOutcome, audit snapshot, and isPending', async () => {
    mockPatchReviewReport.mockRejectedValueOnce(
      makeApiError('GLOBAL_INTERNAL', 500, 'req-reset'),
    );

    const { result } = renderUseResolveReviewReport();

    await act(async () => {
      try {
        await result.current.resolve('r-1', 'dismiss');
      } catch {
        // expected
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.lastOutcome).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastOutcome).toBeNull();
    expect(result.current.audit).toEqual({
      beforeReportId: null,
      beforeAction: null,
      afterReportId: null,
      afterPayload: null,
    });
    expect(result.current.isPending).toBe(false);
  });

  it('isPending flips true then false across a single resolve call', async () => {
    mockPatchReviewReport.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          // Defer the resolve so the test can observe the
          // in-flight state synchronously.
          setTimeout(() => resolve(makeUpdatedReport({ status: 'dismissed' })), 20);
        }),
    );

    const { result } = renderUseResolveReviewReport();

    expect(result.current.isPending).toBe(false);

    act(() => {
      void result.current.resolve('r-1', 'dismiss');
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('drops duplicate in-flight calls (single-flight guard)', async () => {
    let resolvePatch: ((value: unknown) => void) | null = null;
    mockPatchReviewReport.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolvePatch = r;
        }),
    );

    const { result } = renderUseResolveReviewReport();

    let firstCall: Promise<unknown> | undefined;
    let secondCall: Promise<unknown> | undefined;
    act(() => {
      firstCall = result.current.resolve('r-1', 'dismiss');
    });
    act(() => {
      secondCall = result.current.resolve('r-1', 'dismiss');
    });

    // The SDK must be called exactly once even though two resolve()
    // calls were issued. The two returned promises ultimately resolve
    // to the same payload via the underlying in-flight chain.
    expect(mockPatchReviewReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (resolvePatch) resolvePatch(makeUpdatedReport({ status: 'dismissed' }));
      await Promise.all([firstCall, secondCall]);
    });

    // Both calls must resolve with the patched payload (the in-flight
    // chain is shared).
    expect(firstCall).toBeDefined();
    expect(secondCall).toBeDefined();
    await expect(firstCall!).resolves.toMatchObject({ status: 'dismissed' });
    await expect(secondCall!).resolves.toMatchObject({ status: 'dismissed' });
  });
});
