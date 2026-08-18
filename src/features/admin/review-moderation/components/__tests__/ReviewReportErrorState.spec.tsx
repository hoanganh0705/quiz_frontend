

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

import { ReviewReportErrorState } from '@/features/admin/review-moderation/components/ReviewReportErrorState';

function makeApiError(code: string, requestId = 'req-test'): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: code,
code,
config: undefined,
request: undefined,
response: {
status: 500,
statusText: code,
data: {
type: 'https://api.quiz.local/problems/x',
title: code,
status: 500,
detail: code,
extensions: { code, requestId },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('TKT-7.5.D3 — ReviewReportErrorState', () => {
it('renders the permission-denied copy for GLOBAL_FORBIDDEN', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_FORBIDDEN')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
expect(screen.getByText(/GLOBAL_FORBIDDEN/)).toBeInTheDocument();
  });

it('renders the not-found copy for REVIEW_NOT_FOUND', () => {
render(
<ReviewReportErrorState
error={makeApiError('REVIEW_NOT_FOUND')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Reports not available/)).toBeInTheDocument();
  });

it('renders the rate-limit copy for GLOBAL_RATE_LIMITED', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_RATE_LIMITED')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
  });

it('renders the network copy for GLOBAL_TIMEOUT', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_TIMEOUT')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
  });

it('renders the server copy for GLOBAL_INTERNAL_ERROR', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_INTERNAL_ERROR')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Server error/)).toBeInTheDocument();
  });

it('renders the generic copy for an unknown code', () => {
render(
<ReviewReportErrorState
error={makeApiError('SOMETHING_NEW')}
onRetry={vi.fn()}
      />,
    );
expect(screen.getByText(/Could not load reports/)).toBeInTheDocument();
expect(screen.getByText(/SOMETHING_NEW/)).toBeInTheDocument();
  });

it('renders the request id banner when requestId is present', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_INTERNAL_ERROR', 'req-12345')}
onRetry={vi.fn()}
      />,
    );

expect(screen.getByText(/req-12345/)).toBeInTheDocument();
  });

it('invokes onRetry when the retry button is clicked', () => {
const onRetry = vi.fn();
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_INTERNAL_ERROR')}
onRetry={onRetry}
      />,
    );
fireEvent.click(screen.getByTestId('review-report-error-state-retry'));
expect(onRetry).toHaveBeenCalledTimes(1);
  });

it('renders the alert role for accessibility', () => {
render(
<ReviewReportErrorState
error={makeApiError('GLOBAL_INTERNAL_ERROR')}
onRetry={vi.fn()}
      />,
    );
const alerts = screen.getAllByRole('alert');
expect(alerts.length).toBeGreaterThanOrEqual(1);
expect(
alerts.some(
(node) =>
node.getAttribute('data-testid') === 'review-report-error-state',
      ),
    ).toBe(true);
  });
});
