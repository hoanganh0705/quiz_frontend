

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RankingJobStatusPanel } from '../RankingJobStatusPanel';

vi.mock('@/features/admin/components/RequestIdBanner', () => ({
RequestIdBanner: ({ error }: { error: { requestId?: string } }) => (
<div data-testid="request-id-banner">{error?.requestId}</div>
  ),
}));

describe('TKT-7.9.D1 — RankingJobStatusPanel', () => {
it('renders idle state when jobStatus is null', () => {
render(
<RankingJobStatusPanel
jobStatus={null}
affectedUserCount={null}
error={null}
      />,
    );

expect(screen.getByTestId('ranking-job-status-idle')).toBeInTheDocument();
expect(
screen.getByText('Run a ranking admin action to see results here.'),
    ).toBeInTheDocument();
  });

it('renders running state when jobStatus is pending', () => {
render(
<RankingJobStatusPanel
jobStatus="pending"
affectedUserCount={null}
error={null}
      />,
    );

expect(screen.getByTestId('ranking-job-status-running')).toBeInTheDocument();
expect(screen.getByText('Processing…')).toBeInTheDocument();
  });

it('renders running state when jobStatus is running', () => {
render(
<RankingJobStatusPanel
jobStatus="running"
affectedUserCount={null}
error={null}
      />,
    );

expect(screen.getByTestId('ranking-job-status-running')).toBeInTheDocument();
  });

it('renders completed state with affected user count', () => {
render(
<RankingJobStatusPanel
jobStatus="completed"
affectedUserCount={42}
error={null}
      />,
    );

expect(screen.getByTestId('ranking-job-status-completed')).toBeInTheDocument();
expect(screen.getByText('Completed')).toBeInTheDocument();
expect(screen.getByText('Affected 42 users.')).toBeInTheDocument();
  });

it('renders completed state with null affectedUserCount', () => {
render(
<RankingJobStatusPanel
jobStatus="completed"
affectedUserCount={null}
error={null}
      />,
    );

expect(screen.getByTestId('ranking-job-status-completed')).toBeInTheDocument();
expect(screen.getByText('All eligible users processed.')).toBeInTheDocument();
  });

it('renders completed state with affectedUserCount=1', () => {
render(
<RankingJobStatusPanel
jobStatus="completed"
affectedUserCount={1}
error={null}
      />,
    );

expect(screen.getByText('Affected 1 user.')).toBeInTheDocument();
  });

function makeTestError(detail: string, requestId?: string) {
return {
detail,
message: detail,
requestId: requestId ?? '',
correlationId: '',
code: 'TEST_ERROR',
  } as unknown as React.ComponentProps<typeof RankingJobStatusPanel>['error'];
}

it('renders failed state with error message', () => {
const error = makeTestError('Something went wrong', 'req-123');

render(
<RankingJobStatusPanel
jobStatus="failed"
affectedUserCount={null}
error={error}
requestId="req-123"
      />,
    );

expect(screen.getByTestId('ranking-job-status-failed')).toBeInTheDocument();
expect(screen.getByText('Failed')).toBeInTheDocument();
expect(screen.getByText('Something went wrong')).toBeInTheDocument();
expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });

it('does not render RequestIdBanner when requestId is not provided', () => {
const error = makeTestError('Something went wrong');

render(
<RankingJobStatusPanel
jobStatus="failed"
affectedUserCount={null}
error={error}
      />,
    );

expect(screen.queryByTestId('request-id-banner')).not.toBeInTheDocument();
  });
});
