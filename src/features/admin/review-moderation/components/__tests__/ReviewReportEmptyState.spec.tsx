/**
 * `ReviewReportEmptyState.spec.tsx` — unit tests for the queue's
 * empty state.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D3.
 *
 * Coverage contract:
 *
 *   - `filter: 'pending'` renders the documented "no pending
 *     reports" copy.
 *   - `filter: 'resolved'` renders the documented "no resolved
 *     reports" copy.
 *   - The optional `onShowResolved` CTA renders only when
 *     `filter === 'pending'` AND `onShowResolved` is supplied.
 *   - The CTA does not render when `onShowResolved` is omitted or
 *     when `filter === 'resolved'`.
 *   - Clicking the CTA invokes `onShowResolved` exactly once.
 *
 * Runs in the jsdom project because the component is rendered
 * through `@testing-library/react`.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReviewReportEmptyState } from '@/features/admin/review-moderation/components/ReviewReportEmptyState';

describe('TKT-7.5.D3 — ReviewReportEmptyState', () => {
  it('renders the pending copy when filter is pending', () => {
    render(<ReviewReportEmptyState filter="pending" />);
    expect(
      screen.getByTestId('review-report-empty-state-pending'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No pending reports/)).toBeInTheDocument();
  });

  it('renders the resolved copy when filter is resolved', () => {
    render(<ReviewReportEmptyState filter="resolved" />);
    expect(
      screen.getByTestId('review-report-empty-state-resolved'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No resolved reports/)).toBeInTheDocument();
  });

  it('does not render the CTA when onShowResolved is omitted', () => {
    render(<ReviewReportEmptyState filter="pending" />);
    expect(
      screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the CTA for the resolved filter', () => {
    render(
      <ReviewReportEmptyState filter="resolved" onShowResolved={vi.fn()} />,
    );
    expect(
      screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the CTA for the pending filter when onShowResolved is supplied', () => {
    render(
      <ReviewReportEmptyState filter="pending" onShowResolved={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: /View resolved reports/i }),
    ).toBeInTheDocument();
  });

  it('invokes onShowResolved when the CTA is clicked', () => {
    const onShowResolved = vi.fn();
    render(
      <ReviewReportEmptyState filter="pending" onShowResolved={onShowResolved} />,
    );

    const cta = screen.getByRole('button', { name: /View resolved reports/i });
    fireEvent.click(cta);

    expect(onShowResolved).toHaveBeenCalledTimes(1);
  });
});
