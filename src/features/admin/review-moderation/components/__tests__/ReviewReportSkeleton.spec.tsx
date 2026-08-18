

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReviewReportSkeleton } from '@/features/admin/review-moderation/components/ReviewReportSkeleton';

describe('TKT-7.5.D3 — ReviewReportSkeleton', () => {
it('renders the default 3 rows', () => {
render(<ReviewReportSkeleton />);
expect(
screen.getByTestId('review-report-skeleton-row-0'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('review-report-skeleton-row-1'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('review-report-skeleton-row-2'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('review-report-skeleton-row-3'),
    ).not.toBeInTheDocument();
  });

it('renders the explicit row count', () => {
render(<ReviewReportSkeleton rows={6} />);
for (let i = 0; i < 6; i += 1) {
expect(
screen.getByTestId(`review-report-skeleton-row-${i}`),
      ).toBeInTheDocument();
    }
expect(
screen.queryByTestId('review-report-skeleton-row-6'),
    ).not.toBeInTheDocument();
  });

it('clamps rows < 1 to 1 row', () => {
render(<ReviewReportSkeleton rows={0} />);
expect(
screen.getByTestId('review-report-skeleton-row-0'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('review-report-skeleton-row-1'),
    ).not.toBeInTheDocument();
  });

it('sets aria-busy and aria-label for accessibility', () => {
render(<ReviewReportSkeleton />);
const list = screen.getByRole('status');
expect(list).toHaveAttribute('aria-busy', 'true');
expect(list).toHaveAttribute('aria-label', 'Loading review reports');
  });
});
