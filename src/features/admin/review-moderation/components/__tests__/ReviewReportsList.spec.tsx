/**
 * `ReviewReportsList.spec.tsx` — unit tests for the queue's list
 * container.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.E3.
 *
 * Coverage contract (TKT-7.5.E3 acceptance criteria):
 *
 *   AC #1 — `?show=pending` (default) renders the pending list;
 *           `?show=resolved` renders the resolved list.
 *   AC #2 — toggling the filter updates `?show=` in the URL via
 *           `useReviewReports().setShow`.
 *   AC #3 — selecting a row opens the side panel; selecting it
 *           again closes the panel.
 *   AC #4 — action selection mounts the confirm dialog; success
 *           closes the dialog and revalidates the list.
 *   AC #5 — skeleton / empty / error states render based on hook
 *           state.
 *   AC #6 — the list never calls services directly.
 *   AC #7 — type-check exits 0 (handled by `pnpm type-check`).
 *
 * Runs in the jsdom project because the list renders React
 * subtrees via `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ReviewReportsList } from '@/features/admin/review-moderation/components/ReviewReportsList';
import type {
  AdminReportDto,
  ReportState,
} from '@/features/admin/review-moderation/admin-report-types';
import { ApiError } from '@/lib/api';

// ─── Hook / module mocks (hoisted) ──────────────────────────────────────────

interface UseReviewReportsMockReturn {
  items: AdminReportDto[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  error: ApiError | null;
  refresh: () => Promise<void>;
  retryBannerVisible: boolean;
  show: 'pending' | 'resolved';
  setShow: (next: 'pending' | 'resolved') => void;
}

const useReviewReportsMock = vi.hoisted(() =>
  vi.fn<() => UseReviewReportsMockReturn>(() => ({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: 'pending',
    setShow: vi.fn(),
  })),
);

vi.mock('@/features/admin/review-moderation/hooks/useReviewReports', () => ({
  useReviewReports: useReviewReportsMock,
}));

const useReviewMock = vi.hoisted(() =>
  vi.fn((_reviewId: string | null) => ({
    review: null,
    isLoading: false,
    error: null,
  })),
);

vi.mock('@/features/admin/review-moderation/hooks/useReview', () => ({
  useReview: useReviewMock,
}));

const useResolveReviewReportMock = vi.hoisted(() =>
  vi.fn(() => ({
    resolve: vi.fn(async () => null),
    isPending: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
    audit: {
      beforeReportId: null,
      beforeAction: null,
      afterReportId: null,
      afterPayload: null,
    },
  })),
);

vi.mock('@/features/admin/review-moderation/hooks/useResolveReviewReport', () => ({
  useResolveReviewReport: useResolveReviewReportMock,
}));

const usePermissionMock = vi.hoisted(() =>
  vi.fn(() => ({
    isLoading: false,
    error: null,
    hasPermission: true,
  })),
);

const useAuthSessionMock = vi.hoisted(() =>
  vi.fn(() => ({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: 'admin-1' },
  })),
);

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: useAuthSessionMock,
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

function makeReport(
  overrides: Partial<AdminReportDto> & { status: ReportState },
): AdminReportDto {
  return {
    reportId: overrides.reportId ?? 'r-1',
    reviewId: overrides.reviewId ?? 'review-1',
    quizId: overrides.quizId ?? 'q-1',
    quizTitle: overrides.quizTitle ?? 'Sample Quiz',
    reviewerUsername: overrides.reviewerUsername ?? 'reporter-1',
    reportedUserId: overrides.reportedUserId ?? 'author-1',
    rating: overrides.rating ?? 1,
    comment: overrides.comment ?? null,
    reason: overrides.reason ?? 'spam',
    details: overrides.details ?? null,
    status: overrides.status,
    createdAt: overrides.createdAt ?? '2024-01-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T11:00:00.000Z',
  };
}

function renderList() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReviewReportsList />
    </SWRConfig>,
  );
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useReviewReportsMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: 'pending',
    setShow: vi.fn(),
  });
  useReviewMock.mockReturnValue({ review: null, isLoading: false, error: null });
  useResolveReviewReportMock.mockReturnValue({
    resolve: vi.fn(async () => null),
    isPending: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
    audit: {
      beforeReportId: null,
      beforeAction: null,
      afterReportId: null,
      afterPayload: null,
    },
  });
  usePermissionMock.mockReturnValue({
    isLoading: false,
    error: null,
    hasPermission: true,
  });
  useAuthSessionMock.mockReturnValue({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: 'admin-1' },
  });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.5.E3 — ReviewReportsList: tab / filter wiring', () => {
  it('renders the show toggle with the pending tab active by default', () => {
    renderList();
    const tab = screen.getByTestId('review-reports-list-tab-pending');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    const resolvedTab = screen.getByTestId('review-reports-list-tab-resolved');
    expect(resolvedTab).toHaveAttribute('aria-selected', 'false');
  });

  it('reflects the resolved show state when the hook reports show="resolved"', () => {
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'resolved',
      setShow: vi.fn(),
    });

    renderList();
    expect(
      screen.getByTestId('review-reports-list-tab-resolved'),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking the resolved tab invokes setShow("resolved")', () => {
    const setShow = vi.fn();
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow,
    });

    renderList();
    fireEvent.click(screen.getByTestId('review-reports-list-tab-resolved'));
    expect(setShow).toHaveBeenCalledWith('resolved');
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: row rendering', () => {
  it('renders pending rows when items are present and show=pending', () => {
    useReviewReportsMock.mockReturnValue({
      items: [
        makeReport({ reportId: 'r-1', status: 'open' }),
        makeReport({ reportId: 'r-2', status: 'open' }),
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    expect(screen.getByTestId('review-report-row-r-1')).toBeInTheDocument();
    expect(screen.getByTestId('review-report-row-r-2')).toBeInTheDocument();
  });

  it('renders the skeleton when isLoading is true', () => {
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    expect(
      screen.getByTestId('review-report-skeleton-list'),
    ).toBeInTheDocument();
  });

  it('renders the empty state when items=[] and isLoading=false', () => {
    renderList();
    expect(
      screen.getByTestId('review-report-empty-state-pending'),
    ).toBeInTheDocument();
  });

  it('renders the empty state without the resolved CTA when filter is "resolved"', () => {
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'resolved',
      setShow: vi.fn(),
    });

    renderList();
    expect(
      screen.getByTestId('review-report-empty-state-resolved'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the error state with a retry affordance', () => {
    const refresh = vi.fn(async () => undefined);
    const error = new ApiError({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          status: 500,
          detail: 'GLOBAL_INTERNAL_ERROR',
          title: 'GLOBAL_INTERNAL_ERROR',
          extensions: { code: 'GLOBAL_INTERNAL_ERROR', requestId: 'req-1' },
        },
      },
      name: 'AxiosError',
      message: 'GLOBAL_INTERNAL_ERROR',
      config: undefined,
      request: undefined,
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error,
      refresh,
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    expect(screen.getByTestId('review-report-error-state')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('review-report-error-state-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: row selection', () => {
  it('selecting a row opens the side panel', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    // Debug:
    expect(useReviewReportsMock).toHaveBeenCalled();
    const row = screen.getByTestId('review-report-row-r-1');
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('review-reports-side-panel-r-1'),
    ).toBeInTheDocument();
  });

  it('selecting the same row again closes the side panel', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    expect(
      screen.queryByTestId('review-reports-side-panel-r-1'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: action selection', () => {
  it('action selection mounts the confirm dialog with the chosen action', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    fireEvent.click(
      screen.getByTestId('review-report-action-dismiss-r-1'),
    );

    expect(
      screen.getByTestId('review-report-confirm-dialog-r-1'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: pagination', () => {
  it('renders the "load more" button when hasMore=true', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    expect(
      screen.getByTestId('review-reports-list-load-more-button'),
    ).toBeInTheDocument();
  });

  it('clicking "load more" invokes loadMore exactly once', async () => {
    const loadMore = vi.fn(async () => undefined);
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore,
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    await act(async () => {
      fireEvent.click(
        screen.getByTestId('review-reports-list-load-more-button'),
      );
    });
    await waitFor(() => {
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  it('does not render the "load more" button when hasMore=false', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    renderList();
    expect(
      screen.queryByTestId('review-reports-list-load-more-button'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: filter switch clears selection', () => {
  it('switching to the resolved tab clears the selected row', () => {
    useReviewReportsMock.mockReturnValue({
      items: [makeReport({ reportId: 'r-1', status: 'open' })],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'pending',
      setShow: vi.fn(),
    });

    const { rerender } = render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ReviewReportsList />
      </SWRConfig>,
    );
    fireEvent.click(screen.getByTestId('review-report-row-r-1'));
    expect(
      screen.getByTestId('review-reports-side-panel-r-1'),
    ).toBeInTheDocument();

    // Switch to resolved; the mock re-emits with show="resolved"
    // and a fresh items array (no r-1 row).
    useReviewReportsMock.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(async () => undefined),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
      show: 'resolved',
      setShow: vi.fn(),
    });
    rerender(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ReviewReportsList />
      </SWRConfig>,
    );
    expect(
      screen.queryByTestId('review-reports-side-panel-r-1'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.5.E3 — ReviewReportsList: no service imports', () => {
  it('the component source contains no axios or fetch() calls', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '..', 'ReviewReportsList.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
    expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/review-moderation\.service['"]/);
  });
});