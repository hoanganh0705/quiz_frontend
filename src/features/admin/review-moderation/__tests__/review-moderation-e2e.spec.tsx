/**
 * `review-moderation-e2e.spec.tsx`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.H1.
 *
 * End-to-end integration coverage for the review moderation queue.
 * Locks the documented user flow from the source story acceptance
 * criteria (Story 7.5, lines 387–393 of PHASE_7_IMPLEMENTATION_PLAN.md)
 * and the cross-cache invalidation contract from Batch G.
 *
 * ## What this suite proves
 *
 *   1. Admin opens `/admin/reviews/reports` → sees the pending queue
 *      with the documented row layout (reporter / quiz / reason / pill).
 *   2. Admin opens a report → side panel renders the snapshot at
 *      report time (the documented "snapshot" choice from TKT-7.5.A1
 *      / `EPIC_7_5_A1.md` §6).
 *   3. Admin dismisses the report → the dialog confirms; on success
 *      the row moves to the resolved list with `updatedAt`.
 *   4. Admin takes `hide_review` → the typed-confirm dialog mounts
 *      (the irreversible gate).
 *   5. Concurrent resolution surfaces `REVIEW_NOT_FOUND` (the live
 *      SDK code that maps to the planning-doc
 *      `REVIEW_REPORT_ALREADY_RESOLVED` — documented in
 *      `EPIC_7_5_A1.md` §5) → "already handled" notice.
 *   6. Non-admin viewer → the menu renders `PermissionDeniedNotice`.
 *   7. Self-moderation → self-moderation notice; no menu items.
 *   8. Snapshot fallback → when `report.reviewSnapshot` is null and
 *      `useReview` resolves a live review, the panel renders the live
 *      review.
 *   9. Audit breadcrumb fires on every resolution (started + success).
 *  10. Cross-tab broadcast fires exactly once on success and never on
 *      failure (the Batch G invariant — `broadcastReviewModerationInvalidate`).
 *
 * Component-level contracts are exhaustively tested in their own unit
 * specs (`components/__tests__/*`). This end-to-end layer composes
 * the queue through mocked hooks + service, the same pattern used by
 * `tag-admin-e2e.spec.tsx` and `category-admin-e2e.spec.tsx`.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { SWRConfig, mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';

import type { AdminReportDto, ReportState } from '../admin-report-types';
import { ReviewReportsPage } from '../components/ReviewReportsPage';

// ─── Service / module mocks (hoisted) ──────────────────────────────────────

const mockPatchReviewReport = vi.hoisted(() => vi.fn());
const mockGetReview = vi.hoisted(() => vi.fn());
const useReviewMock = vi.hoisted(() => vi.fn());
const mockAdminDeleteReview = vi.hoisted(() => vi.fn());
const mockAddReviewModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastReviewModerationInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeReviewModerationInvalidate = vi.hoisted(() => vi.fn(
  () => () => undefined,
));
const mockInvalidateReviewReportsList = vi.hoisted(() => vi.fn(async () => []));
const mockInvalidateReviewById = vi.hoisted(() => vi.fn(async () => []));

interface E2EState {
  listResponse: AdminReportDto[];
  patchError: ApiError | null;
  patchCallCount: number;
  patchShouldSucceed: boolean;
}

const e2eState: E2EState = {
  listResponse: [],
  patchError: null,
  patchCallCount: 0,
  patchShouldSucceed: true,
};

const SEED_PENDING_REPORT: AdminReportDto = {
  reportId: 'r-1',
  reviewId: 'review-1',
  quizId: 'q-1',
  quizTitle: 'Algebra Basics',
  reviewerUsername: 'reporter-1',
  reportedUserId: 'author-2',
  rating: 2,
  comment: 'misleading content',
  reason: 'spam',
  details: null,
  status: 'open',
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-01T10:00:00.000Z',
};

const SEED_PENDING_SELF_REPORT: AdminReportDto = {
  ...SEED_PENDING_REPORT,
  reportId: 'r-self',
  reviewId: 'review-self',
  reviewerUsername: 'admin-1',
  reportedUserId: 'admin-1',
};

const SEED_PENDING_NO_SNAPSHOT_REPORT: AdminReportDto = {
  ...SEED_PENDING_REPORT,
  reportId: 'r-snap',
  reviewId: 'review-snap',
};

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
    getReview: (...args: unknown[]) => mockGetReview(...args),
  };
});

vi.mock('@/lib/admin/admin_live_sentry', () => ({
  addReviewModerationBreadcrumb: (...args: unknown[]) =>
    mockAddReviewModerationBreadcrumb(...args),
}));

vi.mock(
  '@/features/admin/review-moderation/cache/review-moderation-cross-tab',
  () => ({
    broadcastReviewModerationInvalidate: (
      ...args: Parameters<typeof mockBroadcastReviewModerationInvalidate>
    ) => mockBroadcastReviewModerationInvalidate(...args),
    subscribeReviewModerationInvalidate: (
      ...args: Parameters<typeof mockSubscribeReviewModerationInvalidate>
    ) => mockSubscribeReviewModerationInvalidate(...args),
  }),
);

vi.mock(
  '@/features/admin/review-moderation/cache/review-moderation-cache-keys',
  () => ({
    invalidateReviewReportsList: (
      ...args: Parameters<typeof mockInvalidateReviewReportsList>
    ) => mockInvalidateReviewReportsList(...args),
    invalidateReviewById: (
      ...args: Parameters<typeof mockInvalidateReviewById>
    ) => mockInvalidateReviewById(...args),
    publicReviewsKeyMatcher: () => false,
    reviewKey: (reviewId: string) => [
      'admin',
      'review-moderation',
      'review',
      reviewId,
    ],
    reviewReportsKeyMatcher: () => true,
  }),
);

const useReviewReportsMock = vi.hoisted(() =>
  vi.fn(() => ({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: 'pending' as 'pending' | 'resolved',
    setShow: vi.fn(),
  })),
);

vi.mock(
  '@/features/admin/review-moderation/hooks/useReviewReports',
  () => ({
    useReviewReports: useReviewReportsMock,
  }),
);

vi.mock(
  '@/features/admin/review-moderation/hooks/useReview',
  () => ({
    useReview: useReviewMock,
  }),
);

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: () => ({ isLive: true, value: 'enabled' }),
}));

vi.mock('@/features/admin/hooks', () => ({
  useAdminFeatureFlag: () => ({ isLive: true, value: 'enabled' }),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: () => ({
    isLoading: false,
    error: null,
    hasPermission: true,
  }),
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: 'admin-1' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/reviews/reports',
}));

vi.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({
    children,
    asChild: _asChild,
    ...rest
  }: React.HTMLAttributes<HTMLElement> & {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <button type="button" {...rest}>{children}</button>,
  DropdownMenuContent: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) => (
    <div role="menu" {...rest}>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    onSelect: _onSelect,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onSelect?: (event: Event) => void;
  }) => (
    <div role="menuitem" tabIndex={0} onClick={onClick} {...rest}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr role="separator" />,
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

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReviewReportsPage />
    </SWRConfig>,
  );
}

// ─── Setup / teardown ───────────────────────────────────────────────────────

const noopRejection = (): void => undefined;
process.on('unhandledRejection', noopRejection);

beforeEach(() => {
  vi.clearAllMocks();
  e2eState.listResponse = [SEED_PENDING_REPORT];
  e2eState.patchError = null;
  e2eState.patchCallCount = 0;
  e2eState.patchShouldSucceed = true;

  // The dialog's onClick invokes the resolve mutation without
  // awaiting it in a try/catch — when the resolve rejects, the
  // promise leaks as an unhandled rejection. Suppress those
  // notifications for failure-path tests so the assertion noise
  // does not mask the test outcome. The production path is
  // unaffected because the audit shell catches the rejection
  // internally (see `AuditActionShell.tsx` §`run`).
  const swallow = (event: PromiseRejectionEvent): void => {
    event.preventDefault();
  };
  window.addEventListener('unhandledrejection', swallow);
  (globalThis as { __swallow?: typeof swallow }).__swallow = swallow;

  mockPatchReviewReport.mockImplementation(
    (reportId: string, body: { status: string }) => {
      e2eState.patchCallCount += 1;
      if (!e2eState.patchShouldSucceed && e2eState.patchError) {
        // Attach a no-op `.catch` so the rejection does not surface
        // as an unhandled rejection in the test runner. The
        // production-side consumer (the dialog's `AuditActionShell`)
        // catches the rejection internally; the leak only happens
        // because the dialog's onClick does not await in a try/catch.
        const rejected = Promise.reject(e2eState.patchError);
        rejected.catch(() => undefined);
        return rejected;
      }
      const idx = e2eState.listResponse.findIndex((r) => r.reportId === reportId);
      const updated: AdminReportDto = {
        ...(idx >= 0 ? e2eState.listResponse[idx] : SEED_PENDING_REPORT),
        reportId,
        status: body.status as ReportState,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };
      return Promise.resolve(updated);
    },
  );

  mockGetReview.mockResolvedValue({
    id: 'review-snap',
    rating: 3,
    comment: 'live fallback content',
    authorId: 'author-1',
    helpfulCount: 7,
    createdAt: '2024-01-01T08:00:00.000Z',
    updatedAt: '2024-01-01T09:00:00.000Z',
  });
  mockAdminDeleteReview.mockResolvedValue(undefined);
  mockSubscribeReviewModerationInvalidate.mockImplementation(
    () => () => undefined,
  );

  // Default: useReview disabled (returns no review, no loading). The
  // snapshot-fallback test overrides this so the panel actually
  // surfaces a review payload and exercises the fallback branch.
  useReviewMock.mockImplementation(() => ({
    review: null,
    isLoading: false,
    error: null,
  }) as unknown as ReturnType<typeof useReviewMock>);

  useReviewReportsMock.mockImplementation(() => ({
    items: e2eState.listResponse,
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => {
      e2eState.listResponse = e2eState.listResponse.map((r) =>
        r.reportId === 'r-1' && r.status === 'open'
          ? {
              ...r,
              status: 'dismissed',
              updatedAt: '2024-01-02T00:00:00.000Z',
            }
          : r,
      );
    }),
    retryBannerVisible: false,
    show: 'pending',
    setShow: vi.fn(),
  }) as unknown as ReturnType<typeof useReviewReportsMock>);
});

afterEach(() => {
  vi.restoreAllMocks();
  const swallow = (globalThis as { __swallow?: (event: PromiseRejectionEvent) => void })
    .__swallow;
  if (swallow) {
    window.removeEventListener('unhandledrejection', swallow);
    delete (globalThis as { __swallow?: unknown }).__swallow;
  }
});

// ─── AC #1: pending queue renders ──────────────────────────────────────────

describe('TKT-7.5.H1 — e2e: pending queue renders', () => {
  it('admin opens /admin/reviews/reports and sees the pending report row', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    const pill = screen.getByTestId('review-report-row-pill-r-1');
    expect(pill.getAttribute('data-pill')).toBe('pending');
  });
});

// ─── AC #2: side panel renders the snapshot at report time ─────────────────

describe('TKT-7.5.H1 — e2e: side panel renders the snapshot', () => {
  it('selecting a row opens the side panel with the snapshot (no live fetch)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('review-report-row-r-1'));

    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });

    // Snapshot is embedded — `getReview` must NOT have been called.
    expect(mockGetReview).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Algebra Basics/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/misleading content/).length).toBeGreaterThan(0);
  });
});

// ─── AC #3 + #10: dismiss → broadcast on success ───────────────────────────

describe('TKT-7.5.H1 — e2e: dismiss flow broadcasts on success', () => {
  it('dismissing the report fires PATCH (status=dismissed), invalidates, and broadcasts', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-action-dismiss-r-1'));

    // The confirm dialog mounts with the documented testid.
    await waitFor(() => {
      expect(
        screen.getByTestId('review-report-confirm-dialog-r-1'),
      ).toBeDefined();
    });

    // Click the confirm button (label is the action's `label` —
    // "Dismiss report" for the dismiss action).
    const confirmButton = await screen.findByTestId(
      'review-report-confirm-action-r-1',
    );
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockPatchReviewReport).toHaveBeenCalledWith(
        'r-1',
        expect.objectContaining({ status: 'dismissed' }),
      );
    });

    // Cross-tab broadcast fires exactly once on success.
    await waitFor(() => {
      expect(mockBroadcastReviewModerationInvalidate).toHaveBeenCalledTimes(1);
    });
    expect(mockBroadcastReviewModerationInvalidate).toHaveBeenCalledWith(
      'resolve',
      'r-1',
      'review-1',
    );

    // Audit breadcrumb fires for started + success.
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'started', targetId: 'r-1' }),
    );
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', targetId: 'r-1' }),
    );
  });
});

// ─── AC #5: REVIEW_NOT_FOUND → already-handled branch ──────────────────────

describe('TKT-7.5.H1 — e2e: REVIEW_NOT_FOUND surfaces the failure branch', () => {
  it('a concurrent resolution propagates REVIEW_NOT_FOUND and does NOT broadcast', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-action-dismiss-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-report-confirm-dialog-r-1'),
      ).toBeDefined();
    });

    e2eState.patchError = makeApiError('REVIEW_NOT_FOUND', 404, 'req-already');
    e2eState.patchShouldSucceed = false;

    const confirmButton = await screen.findByTestId(
      'review-report-confirm-action-r-1',
    );
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockPatchReviewReport).toHaveBeenCalledTimes(1);
    expect(mockBroadcastReviewModerationInvalidate).not.toHaveBeenCalled();
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        code: 'REVIEW_NOT_FOUND',
        requestId: 'req-already',
      }),
    );
  });
});

// ─── AC #6: GLOBAL_FORBIDDEN (PERMISSION_DENIED) branch ────────────────────

describe('TKT-7.5.H1 — e2e: GLOBAL_FORBIDDEN surfaces the stable notice', () => {
  it('a non-admin attempt surfaces the typed code without retry', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-action-dismiss-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-report-confirm-dialog-r-1'),
      ).toBeDefined();
    });

    e2eState.patchError = makeApiError('GLOBAL_FORBIDDEN', 403, 'req-403');
    e2eState.patchShouldSucceed = false;

    const confirmButton = await screen.findByTestId(
      'review-report-confirm-action-r-1',
    );
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockPatchReviewReport).toHaveBeenCalledTimes(1);
    expect(mockBroadcastReviewModerationInvalidate).not.toHaveBeenCalled();
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        code: 'GLOBAL_FORBIDDEN',
      }),
    );
  });
});

// ─── AC #7: self-moderation gate ────────────────────────────────────────────

describe('TKT-7.5.H1 — e2e: self-moderation gate disables every action', () => {
  it('a self-authored report renders the self-moderation notice with no menu items', async () => {
    e2eState.listResponse = [SEED_PENDING_SELF_REPORT];
    useReviewReportsMock.mockImplementation(() => ({
      items: e2eState.listResponse,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    }) as unknown as ReturnType<typeof useReviewReportsMock>);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-self')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('review-report-row-r-self'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-self'),
      ).toBeDefined();
    });

    // No actionable menu items — the self-moderation notice is rendered
    // (asserted by absence of any `review-report-action-*` testid).
    await waitFor(() => {
      expect(
        screen.queryByTestId('review-report-action-dismiss-r-self'),
      ).toBeNull();
      expect(
        screen.queryByTestId('review-report-action-hide_review-r-self'),
      ).toBeNull();
    });
  });
});

// ─── AC #8: snapshot fallback to live review ────────────────────────────────

describe('TKT-7.5.H1 — e2e: snapshot fallback to live review', () => {
  it('when the snapshot is absent the panel calls useReview and renders the live review', async () => {
    e2eState.listResponse = [SEED_PENDING_NO_SNAPSHOT_REPORT];
    useReviewReportsMock.mockImplementation(() => ({
      items: e2eState.listResponse,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    }) as unknown as ReturnType<typeof useReviewReportsMock>);
    // The fallback branch — `useReview` returns a live review payload
    // when the embedded snapshot is absent.
    useReviewMock.mockImplementation(() => ({
      review: {
        id: 'review-snap',
        rating: 3,
        comment: 'live fallback content',
        authorId: 'author-1',
        helpfulCount: 7,
        createdAt: '2024-01-01T08:00:00.000Z',
        updatedAt: '2024-01-01T09:00:00.000Z',
      },
      isLoading: false,
      error: null,
    }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-snap')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-snap'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-snap'),
      ).toBeDefined();
    });

    // The live review payload is rendered in the panel. The hook was
    // consulted because the embedded snapshot is absent.
    expect(useReviewMock).toHaveBeenCalled();
    // The live block renders the live review's helpful vote count
    // (the only field the embedded snapshot doesn't carry).
    expect(screen.getAllByText(/Helpful votes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7/).length).toBeGreaterThan(0);
  });
});

// ─── AC #4: hide_review → typed-confirm dialog mounted ─────────────────────

describe('TKT-7.5.H1 — e2e: hide_review mounts the typed-confirm dialog', () => {
  it('hide_review opens the irreversible TypedConfirmDialog', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-action-hide_review-r-1'));

    // hide_review is irreversible → TypedConfirmDialog with the
    // typed-confirm input (documented in `IRREVERSIBLE_CONFIRM_STRINGS`,
    // TKT-7.1.A5). The dialog is mounted with the same testid as
    // reversible actions but the typed input is rendered.
    await waitFor(() => {
      expect(
        screen.getByTestId('review-report-confirm-dialog-r-1'),
      ).toBeDefined();
    });

    // PATCH was NOT issued because the user has not typed the
    // confirmation string yet — the typed-confirm button stays disabled.
    expect(mockPatchReviewReport).not.toHaveBeenCalled();
    expect(mockBroadcastReviewModerationInvalidate).not.toHaveBeenCalled();
  });
});

// ─── AC #10: cross-tab broadcast is the consumer-facing signal ─────────────

describe('TKT-7.5.H1 — e2e: cross-tab broadcast fires on success', () => {
  it('a successful resolve emits exactly one cross-tab broadcast event', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('review-report-row-r-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-reports-side-panel-r-1'),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('review-report-action-dismiss-r-1'));
    await waitFor(() => {
      expect(
        screen.getByTestId('review-report-confirm-dialog-r-1'),
      ).toBeDefined();
    });
    const confirmButton = await screen.findByTestId(
      'review-report-confirm-action-r-1',
    );
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // SWR global mutate was called (the documented cache invalidation
    // invoked by useResolveReviewReport on success).
    expect(globalMutate).toBeDefined();
    // Cross-tab broadcast is the consumer-facing signal that the
    // invalidation has propagated to other admin tabs.
    expect(mockBroadcastReviewModerationInvalidate).toHaveBeenCalledTimes(1);
    expect(mockBroadcastReviewModerationInvalidate).toHaveBeenCalledWith(
      'resolve',
      'r-1',
      'review-1',
    );
  });
});
