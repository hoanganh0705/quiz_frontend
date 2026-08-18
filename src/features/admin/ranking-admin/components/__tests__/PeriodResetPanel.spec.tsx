

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useResetRankingPeriod } from '../../hooks/useResetRankingPeriod';
import { PeriodResetPanel } from '../PeriodResetPanel';

vi.mock('../../hooks/useResetRankingPeriod', () => ({
useResetRankingPeriod: vi.fn(),
}));

vi.mock('@/features/admin/components/RequestIdBanner', () => ({
RequestIdBanner: ({ error }: { error: { requestId?: string } }) => (
<div data-testid="request-id-banner">{error?.requestId}</div>
  ),
}));

vi.mock('@/features/admin/components/TypedConfirmDialog', () => ({
TypedConfirmDialog: ({
open,
onConfirm,
onCancel,
expectedConfirmString,
children,
  }: {
open: boolean;
onConfirm: () => void | Promise<void>;
onCancel: () => void;
expectedConfirmString?: string;
children?: React.ReactNode;
  }) => {
if (!open) return null;
return (
<div data-testid="typed-confirm-dialog">
<span data-testid="typed-confirm-required">
{expectedConfirmString ?? ''}
</span>
{children}
<button
type="button"
data-testid="typed-confirm-dialog-confirm"
onClick={() => {
void onConfirm();
          }}
        >
Confirm
        </button>
<button
type="button"
data-testid="typed-confirm-dialog-cancel"
onClick={onCancel}
        >
Cancel
        </button>
</div>
    );
  },
}));

function makeIdleResult() {
return {
trigger: vi.fn().mockResolvedValue({}),
jobStatus: null,
affectedUserCount: null,
error: null,
isRunning: false,
cooldownRemaining: null,
showCrossUserWarning: false,
validatePeriod: vi.fn(() => ({ valid: true })),
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
vi.mocked(useResetRankingPeriod).mockReset();
vi.mocked(useResetRankingPeriod).mockReturnValue(makeIdleResult());
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('TKT-7.9.E2 — PeriodResetPanel', () => {
it('renders the panel title and period selector', () => {
render(<PeriodResetPanel />);

expect(screen.getByTestId('period-reset-panel')).toBeInTheDocument();
expect(screen.getByText('Reset ranking period')).toBeInTheDocument();
expect(
screen.getByTestId('period-reset-period-input'),
    ).toBeInTheDocument();
  });

it('renders the trigger button', () => {
render(<PeriodResetPanel />);

expect(
screen.getByTestId('period-reset-trigger-button'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('period-reset-trigger-button'),
    ).toHaveTextContent('Reset Period');
  });

it('button is disabled when isRunning', () => {
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
isRunning: true,
    });

render(<PeriodResetPanel />);

expect(
screen.getByTestId('period-reset-trigger-button'),
    ).toBeDisabled();
  });

it('button is disabled when cooldown is active', () => {
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
cooldownRemaining: 90,
    });

render(<PeriodResetPanel />);

expect(
screen.getByTestId('period-reset-trigger-button'),
    ).toBeDisabled();
  });

it('does not show cross-user warning when no valid period is set', () => {
render(<PeriodResetPanel />);

expect(
screen.queryByTestId('ranking-cross-user-impact-warning'),
    ).not.toBeInTheDocument();
  });

it('shows cross-user warning when a valid period is selected', () => {
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
showCrossUserWarning: true,
    });

render(<PeriodResetPanel />);

expect(
screen.getByTestId('ranking-cross-user-impact-warning'),
    ).toBeInTheDocument();
  });

it('clicking the trigger button opens the typed-confirm dialog', () => {
render(<PeriodResetPanel />);

fireEvent.click(screen.getByTestId('period-reset-trigger-button'));

expect(screen.getByTestId('typed-confirm-dialog')).toBeInTheDocument();
  });

it('typed-confirm dialog renders the irreversibility notice', () => {
render(<PeriodResetPanel />);

fireEvent.click(screen.getByTestId('period-reset-trigger-button'));

expect(
screen.getByTestId('period-reset-irreversibility-notice'),
    ).toBeInTheDocument();
  });

it('confirming the typed-confirm dialog calls trigger with reset confirm string', async () => {
const trigger = vi.fn().mockResolvedValue({});
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
trigger: trigger as never,
    });

render(<PeriodResetPanel initialPeriodIdentifier="all" />);

fireEvent.click(screen.getByTestId('period-reset-trigger-button'));

await act(async () => {
fireEvent.click(screen.getByTestId('typed-confirm-dialog-confirm'));
    });

await waitFor(() => {
expect(trigger).toHaveBeenCalled();
    });

const args = trigger.mock.calls[0]?.[0] as {
confirmString?: string;
    };
expect(args?.confirmString).toBeTruthy();
  });

it('renders cooldown notice when cooldown is active', () => {
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
cooldownRemaining: 60,
    });

render(<PeriodResetPanel />);

expect(screen.getByTestId('ranking-cooldown-notice')).toBeInTheDocument();
  });

it('renders job status panel in idle state', () => {
render(<PeriodResetPanel />);

expect(screen.getByTestId('ranking-job-status-idle')).toBeInTheDocument();
  });

it('renders RequestIdBanner when error is present', () => {
vi.mocked(useResetRankingPeriod).mockReturnValue({
...makeIdleResult(),
error: makeApiError('OPERATION_RUNNING', 'req-456'),
    });

render(<PeriodResetPanel />);

expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });

it('preserves the period identifier during mutation', () => {
render(<PeriodResetPanel initialPeriodIdentifier="all" />);

expect(
screen.getByTestId('period-reset-period-input'),
    ).toHaveValue('all');
  });
});
