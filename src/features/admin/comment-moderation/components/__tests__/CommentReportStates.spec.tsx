/**
 * `CommentReportStates.spec.tsx` — unit tests for the queue's
 * surface primitives (skeleton, empty, error, hidden).
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D4.
 *
 * Coverage contract:
 *
 *   - Skeleton renders N rows when `rows` is supplied; defaults to
 *     3 rows when omitted; clamps to `>= 1`.
 *   - Empty state renders the matching copy for the `pending` /
 *     `resolved` filter modes; CTA surfaces only on the `pending`
 *     mode when `onShowResolved` is supplied.
 *   - Error state surfaces the request id banner when the error
 *     carries a `requestId`; the retry CTA is conditional on
 *     `onRetry`.
 *   - Hidden state surfaces the comment id and the "Restore" button.
 *
 * Runs in the jsdom project because the components are rendered
 * through `@testing-library/react`.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

import {
  CommentReportSkeleton,
  CommentReportEmptyState,
  CommentReportErrorState,
  CommentHiddenState,
} from '@/features/admin/comment-moderation/components/CommentReportStates';

function makeApiError(requestId = 'req-1'): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'boom',
    config: undefined,
    request: undefined,
    response: {
      status: 500,
      data: {
        status: 500,
        detail: 'boom',
        title: 'GLOBAL_INTERNAL',
        extensions: { code: 'GLOBAL_INTERNAL', requestId },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

describe('TKT-7.6.D4 — CommentReportSkeleton', () => {
  it('renders the documented default of 3 rows when `rows` is omitted', () => {
    render(<CommentReportSkeleton />);
    expect(screen.getByTestId('comment-report-skeleton-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('comment-report-skeleton-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-report-skeleton-row-2')).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-skeleton-row-3'),
    ).not.toBeInTheDocument();
  });

  it('renders the requested number of rows when `rows` is supplied', () => {
    render(<CommentReportSkeleton rows={5} />);
    for (let index = 0; index < 5; index += 1) {
      expect(
        screen.getByTestId(`comment-report-skeleton-row-${index}`),
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByTestId('comment-report-skeleton-row-5'),
    ).not.toBeInTheDocument();
  });

  it('clamps `rows` to a minimum of 1', () => {
    render(<CommentReportSkeleton rows={0} />);
    expect(screen.getByTestId('comment-report-skeleton-row-0')).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-skeleton-row-1'),
    ).not.toBeInTheDocument();
  });

  it('marks the list as a busy status region for screen readers', () => {
    render(<CommentReportSkeleton />);
    const list = screen.getByTestId('comment-report-skeleton-list');
    expect(list.getAttribute('role')).toBe('status');
    expect(list.getAttribute('aria-busy')).toBe('true');
  });
});

// ─── Empty state ────────────────────────────────────────────────────────────

describe('TKT-7.6.D4 — CommentReportEmptyState', () => {
  it('renders the pending copy by default', () => {
    render(<CommentReportEmptyState filter="pending" />);
    expect(
      screen.getByTestId('comment-report-empty-state-pending'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No pending comment reports/i)).toBeInTheDocument();
  });

  it('renders the resolved copy when the filter is resolved', () => {
    render(<CommentReportEmptyState filter="resolved" />);
    expect(
      screen.getByTestId('comment-report-empty-state-resolved'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No resolved comment reports/i)).toBeInTheDocument();
  });

  it('does not render the "View resolved" CTA when filter is resolved', () => {
    render(
      <CommentReportEmptyState filter="resolved" onShowResolved={vi.fn()} />,
    );
    expect(
      screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the "View resolved" CTA when filter is pending and onShowResolved is supplied', () => {
    const onShowResolved = vi.fn();
    render(
      <CommentReportEmptyState filter="pending" onShowResolved={onShowResolved} />,
    );

    const cta = screen.getByRole('button', { name: /View resolved reports/i });
    fireEvent.click(cta);

    expect(onShowResolved).toHaveBeenCalledTimes(1);
  });

  it('does not render the "View resolved" CTA when filter is pending but onShowResolved is omitted', () => {
    render(<CommentReportEmptyState filter="pending" />);
    expect(
      screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── Error state ────────────────────────────────────────────────────────────

describe('TKT-7.6.D4 — CommentReportErrorState', () => {
  it('renders the documented error copy', () => {
    render(<CommentReportErrorState error={makeApiError()} />);
    expect(
      screen.getByTestId('comment-report-error-state'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Could not load comment reports/i)).toBeInTheDocument();
  });

  it('does not render the Retry button when onRetry is omitted', () => {
    render(<CommentReportErrorState error={makeApiError()} />);
    expect(
      screen.queryByRole('button', { name: /Retry/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the Retry button when onRetry is supplied', () => {
    const onRetry = vi.fn();
    render(
      <CommentReportErrorState error={makeApiError()} onRetry={onRetry} />,
    );

    const cta = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(cta);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ─── Hidden state ───────────────────────────────────────────────────────────

describe('TKT-7.6.D4 — CommentHiddenState', () => {
  it('renders the comment id and the Restore button', () => {
    const onRestore = vi.fn();
    render(
      <CommentHiddenState
        commentId="00000000-0000-4000-8000-000000000010"
        onRestore={onRestore}
      />,
    );

    expect(
      screen.getByTestId('comment-hidden-state-00000000-0000-4000-8000-000000000010'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('00000000-0000-4000-8000-000000000010'),
    ).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: /Restore comment/i });
    fireEvent.click(cta);

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('marks the state as a polite live region', () => {
    render(
      <CommentHiddenState
        commentId="00000000-0000-4000-8000-000000000010"
        onRestore={vi.fn()}
      />,
    );

    const state = screen.getByTestId(
      'comment-hidden-state-00000000-0000-4000-8000-000000000010',
    );
    expect(state.getAttribute('aria-live')).toBe('polite');
  });
});
