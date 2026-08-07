/**
 * `CommentReportDetailPanel.spec.tsx` — unit tests for the queue's
 * side-panel component.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.E2.
 *
 * Coverage contract (TKT-7.6.E2 acceptance criteria):
 *
 *   AC #1 — the panel always fetches the live comment (per A1
 *           evidence: the SDK DTO does NOT carry a `commentSnapshot`
 *           field). The report metadata block renders the
 *           documented DTO fields without an extra fetch.
 *   AC #2 — when `useComment` returns a payload, the panel renders
 *           the comment body, author, and timestamps with a "live
 *           at fetch time" footnote.
 *   AC #3 — when the offending comment is hidden (`isHidden:
 *           true`), the panel renders `CommentHiddenState` with a
 *           restore affordance.
 *   AC #4 — the panel close affordance invokes `onClose`.
 *   AC #5 — the panel never imports
 *           `comment-moderation.service.ts` or
 *           `comments.service.ts` directly.
 *   AC #6 — type-check exits 0 (handled by `pnpm type-check`).
 *
 * Runs in the jsdom project because the panel is rendered through
 * `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CommentReportDetailPanel } from '@/features/admin/comment-moderation/components/CommentReportDetailPanel';
import type {
  CommentReportDto,
  CommentReportState,
} from '@/features/admin/comment-moderation/admin-comment-report-types';
import type { CommentDto } from '@/lib/api/generated/schemas';
import type { AuthorDtoDisplayName } from '@/lib/api/generated/schemas/authorDtoDisplayName';
import type { AuthorDtoAvatarUrl } from '@/lib/api/generated/schemas/authorDtoAvatarUrl';

// ─── Hook mocks (hoisted) ──────────────────────────────────────────────────

type UseCommentReturn = ReturnType<typeof useCommentMock>;

const useCommentMock = vi.hoisted(() =>
  vi.fn((_params: { commentId: string }) => ({
    comment: null as CommentDto | null,
    isLoading: false,
    error: null,
    outcome: 'pending' as 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted',
    refresh: vi.fn(async () => null),
    mutate: vi.fn(async () => null),
  })),
);

vi.mock('@/features/admin/comment-moderation/hooks/useComment', () => ({
  useComment: (params: { commentId: string }) => useCommentMock(params),
}));

void (null as unknown as UseCommentReturn);

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReport(
  overrides: Partial<CommentReportDto> & { status: CommentReportState },
): CommentReportDto {
  return {
    reportId: overrides.reportId ?? 'r-1',
    reporterId: overrides.reporterId ?? 'reporter-1',
    commentId: overrides.commentId ?? '00000000-0000-4000-8000-000000000001',
    reason: overrides.reason ?? 'misinformation',
    details: overrides.details ?? null,
    status: overrides.status,
    reviewedByUserId: overrides.reviewedByUserId ?? null,
    reviewedAt: overrides.reviewedAt ?? null,
    actionTaken: overrides.actionTaken ?? false,
    createdAt: overrides.createdAt ?? '2024-01-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T11:00:00.000Z',
  };
}

function makeComment(
  overrides: Partial<CommentDto> = {},
): CommentDto {
  return {
    id: overrides.id ?? '00000000-0000-4000-8000-000000000001',
    quizId: overrides.quizId ?? 'q-1',
    authorId: overrides.authorId ?? 'author-1',
    author: overrides.author ?? {
      userId: 'author-1',
      username: 'author-username',
      displayName: 'Author Display' as unknown as AuthorDtoDisplayName,
      avatarUrl: null as AuthorDtoAvatarUrl,
    },
    parentCommentId: overrides.parentCommentId ?? null,
    body: overrides.body ?? 'misleading content body',
    isHidden: overrides.isHidden ?? false,
    hiddenById: overrides.hiddenById ?? null,
    hiddenAt: overrides.hiddenAt ?? null,
    votesCount: overrides.votesCount ?? 0,
    upvotesCount: overrides.upvotesCount ?? 0,
    downvotesCount: overrides.downvotesCount ?? 0,
    repliesCount: overrides.repliesCount ?? 0,
    createdAt: overrides.createdAt ?? '2024-01-01T09:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T09:30:00.000Z',
    deletedAt: overrides.deletedAt ?? null,
  };
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useCommentMock.mockReturnValue({
    comment: null,
    isLoading: false,
    error: null,
    outcome: 'pending',
    refresh: vi.fn(async () => null),
    mutate: vi.fn(async () => null),
  });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.E2 — CommentReportDetailPanel: report metadata block', () => {
  it('renders the snapshot block with documented DTO fields (reporter, reason, createdAt)', () => {
    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-snapshot-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/reporter-1/)).toBeInTheDocument();
    expect(screen.getByText(/misinformation/i)).toBeInTheDocument();
  });

  it('renders the "closed" footer block when status is not open', () => {
    const report = makeReport({
      status: 'dismissed',
      reviewedAt: '2024-01-02T09:00:00.000Z',
      reviewedByUserId: 'admin-1',
    });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-resolved-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/This report is closed/)).toBeInTheDocument();
  });

  it('renders the "details" sub-text when the report carries free-form notes', () => {
    const report = makeReport({
      status: 'open',
      details: 'the comment contained a misleading claim about X',
    });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/the comment contained a misleading claim/),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.E2 — CommentReportDetailPanel: live-comment fallback', () => {
  it('renders the documented "Live at fetch time" footnote when live comment is loaded', () => {
    useCommentMock.mockReturnValue({
      comment: makeComment({
        body: 'misleading content body',
        authorId: 'author-1',
        author: {
          userId: 'author-1',
          username: 'live-author',
          displayName: 'Live Author' as unknown as AuthorDtoDisplayName,
          avatarUrl: null as AuthorDtoAvatarUrl,
        },
      }),
      isLoading: false,
      error: null,
      outcome: 'success',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-live-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Live at fetch time/)).toBeInTheDocument();
    expect(
      screen.getByTestId(`comment-report-detail-live-text-r-1`),
    ).toHaveTextContent(/misleading content body/);
  });

  it('renders the "loading" affordance while the live read is in flight', () => {
    useCommentMock.mockReturnValue({
      comment: null,
      isLoading: true,
      error: null,
      outcome: 'pending',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-live-loading-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Loading live comment/)).toBeInTheDocument();
  });

  it('renders the "not found" affordance when the live read returns COMMENT_NOT_FOUND', () => {
    useCommentMock.mockReturnValue({
      comment: null,
      isLoading: false,
      error: null,
      outcome: 'not-found',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-live-empty-r-1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument();
  });

  it('surfaces the live-read forbidden error as a non-blocking notice', () => {
    useCommentMock.mockReturnValue({
      comment: null,
      isLoading: false,
      error: null,
      outcome: 'forbidden',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-detail-live-error-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Live comment is unavailable/),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.E2 — CommentReportDetailPanel: hidden-comment affordance', () => {
  it('renders CommentHiddenState when the live comment is hidden', () => {
    useCommentMock.mockReturnValue({
      comment: makeComment({
        isHidden: true,
        hiddenById: 'admin-1',
        hiddenAt: '2024-02-01T10:00:00.000Z',
      }),
      isLoading: false,
      error: null,
      outcome: 'success',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const report = makeReport({ status: 'actioned' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        `comment-hidden-state-${report.commentId}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/This comment is hidden/)).toBeInTheDocument();
  });

  it('invokes onRestore with the comment id when the admin clicks Restore', () => {
    useCommentMock.mockReturnValue({
      comment: makeComment({ isHidden: true }),
      isLoading: false,
      error: null,
      outcome: 'success',
      refresh: vi.fn(async () => null),
      mutate: vi.fn(async () => null),
    });

    const onRestore = vi.fn();
    const report = makeReport({ status: 'actioned' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={vi.fn()}
        onRestore={onRestore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Restore comment/i }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith(report.commentId);
  });
});

describe('TKT-7.6.E2 — CommentReportDetailPanel: close affordance', () => {
  it('header close button invokes onClose exactly once', () => {
    const onClose = vi.fn();
    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('comment-report-detail-close-r-1'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('footer close button invokes onClose exactly once', () => {
    const onClose = vi.fn();
    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByTestId('comment-report-detail-close-footer-r-1'),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key invokes onClose', () => {
    const onClose = vi.fn();
    const report = makeReport({ status: 'open' });
    render(
      <CommentReportDetailPanel
        report={report}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    fireEvent.keyDown(
      screen.getByTestId('comment-report-detail-panel-r-1'),
      { key: 'Escape' },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.6.E2 — CommentReportDetailPanel: no service imports', () => {
  it('the component source contains no axios or fetch() calls', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '..', 'CommentReportDetailPanel.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
    // The panel must never import the service module directly.
    expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/comment-moderation\.service['"]/);
    expect(source).not.toMatch(/from\s+['"]@\/features\/comments\/services\/comments\.service['"]/);
  });
});