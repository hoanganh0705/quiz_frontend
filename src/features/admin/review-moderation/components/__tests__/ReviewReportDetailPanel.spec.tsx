/**
 * `ReviewReportDetailPanel.spec.tsx` — unit tests for the queue's
 * side-panel component.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.E2.
 *
 * Coverage contract (TKT-7.5.E2 acceptance criteria):
 *
 *   AC #1 — snapshot block renders the documented DTO fields
 *           (`quizTitle`, `reviewerUsername`, `rating`, `comment`,
 *           `reason`) without an extra fetch.
 *   AC #2 — when the live `useReview` read returns a payload, the
 *           panel renders the documented live values
 *           (`helpfulCount`, `createdAt`, etc.) with a "live at
 *           fetch time" footnote.
 *   AC #3 — the panel close affordance invokes `onClose`.
 *   AC #4 — the panel never imports
 *           `review-moderation.service.ts` or
 *           `reviews.service.ts` directly (no service calls
 *           originate from the file).
 *   AC #5 — type-check exits 0 (handled by `pnpm type-check`).
 *
 * Runs in the jsdom project because the panel is rendered through
 * `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReviewReportDetailPanel } from '@/features/admin/review-moderation/components/ReviewReportDetailPanel';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';
import type { ReviewDetailResponseDto } from '@/lib/api/generated/schemas';

// ─── Hook mocks (hoisted) ──────────────────────────────────────────────────

const useReviewMock = vi.hoisted(() =>
  vi.fn((_reviewId: string) => ({
    review: null as ReviewDetailResponseDto | null,
    isLoading: false,
    error: null,
  })),
);

const useResolveReviewReportMock = vi.hoisted(() =>
  vi.fn(() => ({
    resolve: vi.fn(),
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

vi.mock('@/features/admin/review-moderation/hooks/useReview', () => ({
  useReview: useReviewMock,
}));

vi.mock('@/features/admin/review-moderation/hooks/useResolveReviewReport', () => ({
  useResolveReviewReport: useResolveReviewReportMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReport(
  overrides: Partial<AdminReportDto> = {},
): AdminReportDto {
  return {
    reportId: overrides.reportId ?? 'r-1',
    reviewId: overrides.reviewId ?? 'review-1',
    quizId: overrides.quizId ?? 'q-1',
    quizTitle: overrides.quizTitle ?? 'Sample Quiz',
    reviewerUsername: overrides.reviewerUsername ?? 'reporter-1',
    reportedUserId: overrides.reportedUserId ?? 'author-1',
    rating: overrides.rating ?? 4,
    comment: 'comment' in overrides ? overrides.comment : 'misleading content',
    reason: overrides.reason ?? 'misinformation',
    details: overrides.details ?? null,
    status: overrides.status ?? 'open',
    createdAt: overrides.createdAt ?? '2024-01-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T11:00:00.000Z',
  };
}

function makeReview(
  overrides: Partial<ReviewDetailResponseDto> = {},
): ReviewDetailResponseDto {
  return {
    reviewId: overrides.reviewId ?? 'review-1',
    quizId: overrides.quizId ?? 'q-1',
    quizTitle: overrides.quizTitle ?? 'Sample Quiz',
    userId: overrides.userId ?? 'author-1',
    username: overrides.username ?? 'author-1',
    rating: overrides.rating ?? 4,
    comment: overrides.comment ?? 'misleading content',
    createdAt: overrides.createdAt ?? '2024-01-01T09:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T09:30:00.000Z',
    helpfulCount: overrides.helpfulCount ?? 7,
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useReviewMock.mockReturnValue({
    review: null,
    isLoading: false,
    error: null,
  });
  useResolveReviewReportMock.mockReturnValue({
    resolve: vi.fn(),
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
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.5.E2 — ReviewReportDetailPanel: snapshot block', () => {
  it('renders the snapshot block with documented DTO fields', () => {
    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-snapshot-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sample Quiz/)).toBeInTheDocument();
    expect(screen.getByText(/reporter-1/)).toBeInTheDocument();
    expect(screen.getByText(/4\/5/)).toBeInTheDocument();
    expect(screen.getByText(/misleading content/)).toBeInTheDocument();
    expect(screen.getByText(/misinformation/i)).toBeInTheDocument();
  });

  it('renders the "no comment" affordance when the comment is null', () => {
    const report = makeReport({ comment: null });
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByText(/The reviewer did not leave a comment/),
    ).toBeInTheDocument();
  });

  it('renders the "closed" footer block when status is not open', () => {
    const report = makeReport({ status: 'dismissed' });
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-resolved-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/This report is closed/)).toBeInTheDocument();
  });
});

describe('TKT-7.5.E2 — ReviewReportDetailPanel: live-review fallback', () => {
  it('renders the documented "Live at fetch time" footnote when live review is loaded', () => {
    useReviewMock.mockReturnValue({
      review: makeReview({ helpfulCount: 12, username: 'live-author' }),
      isLoading: false,
      error: null,
    });

    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-live-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Live at fetch time/)).toBeInTheDocument();
    expect(screen.getByText(/live-author/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('renders the "loading" affordance while the live read is in flight', () => {
    useReviewMock.mockReturnValue({
      review: null,
      isLoading: true,
      error: null,
    });

    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-live-loading-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Loading live review/)).toBeInTheDocument();
  });

  it('renders the empty affordance when the live read returns null', () => {
    useReviewMock.mockReturnValue({
      review: null,
      isLoading: false,
      error: null,
    });

    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-live-empty-r-1'),
    ).toBeInTheDocument();
  });

  it('surfaces the live-read error as a non-blocking notice', () => {
    useReviewMock.mockReturnValue({
      review: null,
      isLoading: false,
      // The hook's `error` field is typed `ApiError | null`; we
      // cast through `unknown` to satisfy the test fixture without
      // re-creating an axios-shaped error.
      error: new Error('offline') as unknown as null,
    });

    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-detail-live-error-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Live review is unavailable/),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.5.E2 — ReviewReportDetailPanel: close affordance', () => {
  it('header close button invokes onClose exactly once', () => {
    const onClose = vi.fn();
    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('review-report-detail-close-r-1'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('footer close button invokes onClose exactly once', () => {
    const onClose = vi.fn();
    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={onClose} />);

    fireEvent.click(
      screen.getByTestId('review-report-detail-close-footer-r-1'),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key invokes onClose', () => {
    const onClose = vi.fn();
    const report = makeReport();
    render(<ReviewReportDetailPanel report={report} onClose={onClose} />);

    fireEvent.keyDown(
      screen.getByTestId('review-report-detail-panel-r-1'),
      { key: 'Escape' },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.5.E2 — ReviewReportDetailPanel: no service imports', () => {
  it('the component source contains no axios or fetch() calls', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '..', 'ReviewReportDetailPanel.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
    // The panel must never import the service module directly.
    expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/review-moderation\.service['"]/);
    expect(source).not.toMatch(/from\s+['"]@\/features\/reviews\/services\/reviews\.service['"]/);
  });
});