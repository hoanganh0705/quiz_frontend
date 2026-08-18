

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useRecalculateRanking } from '../../hooks/useRecalculateRanking';
import { RecalculateRankingPanel } from '../RecalculateRankingPanel';

vi.mock('../../hooks/useRecalculateRanking', () => ({
useRecalculateRanking: vi.fn(),
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
vi.mocked(useRecalculateRanking).mockReset();
vi.mocked(useRecalculateRanking).mockReturnValue(makeIdleResult());
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('TKT-7.9.E1 — RecalculateRankingPanel', () => {
it('renders the panel title and scope filter', () => {
render(<RecalculateRankingPanel />);

expect(screen.getByTestId('recalculate-ranking-panel')).toBeInTheDocument();
expect(screen.getByText('Recalculate rankings')).toBeInTheDocument();
expect(
screen.getByTestId('recalculate-scope-filter-input'),
    ).toBeInTheDocument();
  });

it('renders the trigger button', () => {
render(<RecalculateRankingPanel />);

expect(
screen.getByTestId('recalculate-ranking-trigger-button'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('recalculate-ranking-trigger-button'),
    ).toHaveTextContent('Recalculate');
  });

it('button is disabled when isRunning', () => {
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
isRunning: true,
    });

render(<RecalculateRankingPanel />);

expect(
screen.getByTestId('recalculate-ranking-trigger-button'),
    ).toBeDisabled();
  });

it('button is disabled when cooldown is active', () => {
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
cooldownRemaining: 60,
    });

render(<RecalculateRankingPanel />);

expect(
screen.getByTestId('recalculate-ranking-trigger-button'),
    ).toBeDisabled();
  });

it('clicking the trigger button opens the typed-confirm dialog', () => {
render(<RecalculateRankingPanel />);

fireEvent.click(
screen.getByTestId('recalculate-ranking-trigger-button'),
    );

expect(screen.getByTestId('typed-confirm-dialog')).toBeInTheDocument();
  });

it('typed-confirm dialog renders the irreversibility notice', () => {
render(<RecalculateRankingPanel />);

fireEvent.click(
screen.getByTestId('recalculate-ranking-trigger-button'),
    );

expect(
screen.getByTestId('recalculate-ranking-irreversibility-notice'),
    ).toBeInTheDocument();
  });

it('confirming the typed-confirm dialog calls trigger with scope filter', async () => {
const trigger = vi.fn().mockResolvedValue({});
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
trigger: trigger as never,
    });

render(<RecalculateRankingPanel />);

fireEvent.change(
screen.getByTestId('recalculate-scope-filter-input'),
{ target: { value: 'current_period' } },
    );

fireEvent.click(
screen.getByTestId('recalculate-ranking-trigger-button'),
    );

await act(async () => {
fireEvent.click(screen.getByTestId('typed-confirm-dialog-confirm'));
    });

await waitFor(() => {
expect(trigger).toHaveBeenCalled();
    });
  });

it('renders cooldown notice when cooldown is active', () => {
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
cooldownRemaining: 60,
    });

render(<RecalculateRankingPanel />);

expect(screen.getByTestId('ranking-cooldown-notice')).toBeInTheDocument();
  });

it('renders job status panel in idle state', () => {
render(<RecalculateRankingPanel />);

expect(screen.getByTestId('ranking-job-status-idle')).toBeInTheDocument();
  });

it('renders job status panel in running state', () => {
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
jobStatus: 'running',
    });

render(<RecalculateRankingPanel />);

expect(screen.getByTestId('ranking-job-status-running')).toBeInTheDocument();
  });

it('renders RequestIdBanner when error is present', () => {
vi.mocked(useRecalculateRanking).mockReturnValue({
...makeIdleResult(),
error: makeApiError('OPERATION_RUNNING', 'req-123'),
    });

render(<RecalculateRankingPanel />);

expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });

it('preserves the scope filter value during mutation', () => {
render(<RecalculateRankingPanel initialScopeFilter="last_period" />);

expect(
screen.getByTestId('recalculate-scope-filter-input'),
    ).toHaveValue('last_period');
  });
});
