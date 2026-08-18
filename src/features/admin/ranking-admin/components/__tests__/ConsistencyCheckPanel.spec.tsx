

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useCheckRankingConsistency } from '../../hooks/useCheckRankingConsistency';
import { ConsistencyCheckPanel } from '../ConsistencyCheckPanel';

vi.mock('../../hooks/useCheckRankingConsistency', () => ({
useCheckRankingConsistency: vi.fn(),
}));

vi.mock('@/features/admin/components/RequestIdBanner', () => ({
RequestIdBanner: ({ error }: { error: { requestId?: string } }) => (
<div data-testid="request-id-banner">{error?.requestId}</div>
  ),
}));

function makeIdleResult() {
return {
trigger: vi.fn().mockResolvedValue({}),
inconsistencies: [],
totalCount: null,
checkedAt: null,
error: null,
isRunning: false,
isPartialResult: false,
audit: { before: null, after: null },
reset: vi.fn(),
  };
}

function makeApiError(code: string, requestId?: string): ApiError {

const error = {
isAxiosError: true,
response: {
status: code === 'PERMISSION_DENIED' ? 403 : 409,
statusText: '',
headers: {},
config: { headers: {} },
data: {
status: code === 'PERMISSION_DENIED' ? 403 : 409,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
  };
return new ApiError(error as unknown as ConstructorParameters<typeof ApiError>[0]);
}

beforeEach(() => {
vi.mocked(useCheckRankingConsistency).mockReset();
vi.mocked(useCheckRankingConsistency).mockReturnValue(makeIdleResult());
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('TKT-7.9.E3 — ConsistencyCheckPanel', () => {
it('renders the panel title and trigger button', () => {
render(<ConsistencyCheckPanel />);

expect(screen.getByTestId('consistency-check-panel')).toBeInTheDocument();
expect(screen.getByText('Consistency Check')).toBeInTheDocument();
expect(
screen.getByTestId('consistency-check-trigger-button'),
    ).toBeInTheDocument();
  });

it('button is disabled when isRunning', () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
isRunning: true,
    });

render(<ConsistencyCheckPanel />);

expect(
screen.getByTestId('consistency-check-trigger-button'),
    ).toBeDisabled();
  });

it('clicking the trigger button calls trigger', async () => {
const trigger = vi.fn().mockResolvedValue({});
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
trigger: trigger as never,
    });

render(<ConsistencyCheckPanel />);

await act(async () => {
fireEvent.click(
screen.getByTestId('consistency-check-trigger-button'),
      );
    });

await waitFor(() => {
expect(trigger).toHaveBeenCalledTimes(1);
    });
  });

it('renders the loading skeleton when isRunning', () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
isRunning: true,
    });

render(<ConsistencyCheckPanel />);

expect(
screen.getByTestId('consistency-check-skeleton'),
    ).toBeInTheDocument();
  });

it('renders the empty state when totalCount is 0', async () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
totalCount: 0,
checkedAt: new Date(),
    });

render(<ConsistencyCheckPanel />);

await act(async () => {
fireEvent.click(
screen.getByTestId('consistency-check-trigger-button'),
      );
    });

expect(
screen.getByTestId('consistency-check-empty-state'),
    ).toBeInTheDocument();
  });

it('renders the inconsistency table when inconsistencies exist', async () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
inconsistencies: [
{
userId: 'u-1',
field: 'totalXp',
expected: 100,
actual: 90,
period: 'current',
        },
      ],
totalCount: 1,
checkedAt: new Date(),
    });

render(<ConsistencyCheckPanel />);

await act(async () => {
fireEvent.click(
screen.getByTestId('consistency-check-trigger-button'),
      );
    });

expect(
screen.getByTestId('ranking-inconsistency-row'),
    ).toBeInTheDocument();
  });

it('renders the partial result notice when isPartialResult is true', () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
isPartialResult: true,
totalCount: 5,
checkedAt: new Date(),
    });

render(<ConsistencyCheckPanel />);

expect(
screen.getByTestId('consistency-check-partial-notice'),
    ).toBeInTheDocument();
  });

it('renders RequestIdBanner when error is present', () => {
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
error: makeApiError('OPERATION_RUNNING', 'req-789'),
    });

render(<ConsistencyCheckPanel />);

expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });

it('clicking the reset button calls reset and clears the state', async () => {
const reset = vi.fn();
vi.mocked(useCheckRankingConsistency).mockReturnValue({
...makeIdleResult(),
reset: reset as never,
totalCount: 0,
checkedAt: new Date(),
    });

render(<ConsistencyCheckPanel />);

fireEvent.click(
screen.getByTestId('consistency-check-trigger-button'),
    );

await waitFor(() => {
expect(
screen.getByTestId('consistency-check-reset-button'),
      ).toBeInTheDocument();
    });

fireEvent.click(screen.getByTestId('consistency-check-reset-button'));

expect(reset).toHaveBeenCalled();
  });
});
