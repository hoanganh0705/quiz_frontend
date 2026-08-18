

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { TournamentRegistrationCta } from '@/features/tournaments/components/TournamentRegistrationCta';
import type { UseTournamentRegistrationResult } from '@/features/tournaments/hooks';
import { ApiError } from '@/lib/api';

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: vi.fn(() => 'live'),
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: vi.fn(() => ({
bootstrapState: 'authenticated',
currentUser: { userId: 'user-123', id: 'user-123' },
  })),
}));

const mockUseTournamentRegistration = vi.fn();
vi.mock('@/features/tournaments/hooks', () => ({
useTournamentRegistration: (...args: unknown[]) => mockUseTournamentRegistration(...args),
}));

vi.mock('@/features/tournaments/components/shared/WithdrawDialog', () => ({
WithdrawDialog: ({ open, onConfirm, onCancel, loading }: { open: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean }) => {
if (!open) return null;
return (
<div data-testid="withdraw-dialog-mock">
<button data-testid="dialog-confirm" onClick={onConfirm} disabled={loading}>Confirm</button>
<button data-testid="dialog-cancel" onClick={onCancel}>Cancel</button>
</div>
    );
  },
}));

vi.mock('@/features/tournaments/components/shared/RegistrationErrorBanner', () => ({
RegistrationErrorBanner: ({ error, onDismiss }: { error: ApiError | null; onDismiss?: () => void }) => {
if (!error) return null;
return (
<div data-testid="error-banner-mock" data-code={error.code}>
{error.code}
{onDismiss && <button data-testid="dismiss-btn" onClick={onDismiss}>Dismiss</button>}
</div>
    );
  },
}));

function makeMockResult(overrides: Partial<UseTournamentRegistrationResult> = {}): UseTournamentRegistrationResult {
return {
participation: null,
isRegistered: false,
isEligible: true,
canWithdraw: false,
isLoading: false,
register: vi.fn(),
withdraw: vi.fn(),
registerState: 'idle',
withdrawState: 'idle',
registerError: null,
withdrawError: null,
reset: vi.fn(),
...overrides,
  } as unknown as UseTournamentRegistrationResult;
}

function makeApiError(code: string) {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock: ${code}`,
code,
config: undefined,
request: undefined,
response: {
status: 409,
data: { type: 'about:blank', title: `Error ${code}`, status: 409, code },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('TournamentRegistrationCta', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

describe('feature flag', () => {
it('renders nothing when flag is placeholder', () => {
vi.mocked(require('@/lib/feature-flags').getFeatureFlagValue).mockReturnValueOnce('placeholder');
mockUseTournamentRegistration.mockReturnValue(makeMockResult());

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.queryByTestId('tournament-cta-sign-in')).not.toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-register')).not.toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-withdraw')).not.toBeInTheDocument();
    });
  });

describe('unauthenticated state', () => {
it('renders "Sign in to register" button', () => {
vi.mocked(require('@/features/auth/hooks/use-auth-session').useAuthSession).mockReturnValueOnce({
bootstrapState: 'unauthenticated',
currentUser: null,
      });
mockUseTournamentRegistration.mockReturnValue(makeMockResult({ isLoading: true }));

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.getByTestId('tournament-cta-sign-in')).toBeInTheDocument();
    });
  });

describe('eligible-not-registered state', () => {
it('renders "Register" button when eligible and not registered', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: false,
isEligible: true,
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.getByTestId('tournament-cta-register')).toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-withdraw')).not.toBeInTheDocument();
    });
  });

describe('registered state', () => {
it('renders "Withdraw" button when registered', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: true,
isEligible: true,
canWithdraw: true,
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.getByTestId('tournament-cta-withdraw')).toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-register')).not.toBeInTheDocument();
    });
  });

describe('ineligible state', () => {
it('renders nothing when not eligible', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: false,
isEligible: false,
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.queryByTestId('tournament-cta-register')).not.toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-withdraw')).not.toBeInTheDocument();
    });
  });

describe('pending state', () => {
it('disables register button when registerState is pending', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: false,
isEligible: true,
registerState: 'pending',
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

const registerBtn = screen.getByTestId('tournament-cta-register');
expect(registerBtn).toBeDisabled();
    });

it('disables withdraw button when withdrawState is pending', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: true,
isEligible: true,
withdrawState: 'pending',
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

const withdrawBtn = screen.getByTestId('tournament-cta-withdraw');
expect(withdrawBtn).toBeDisabled();
    });
  });

describe('error states', () => {
it('renders error banner for ALREADY_REGISTERED', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
registerState: 'error',
registerError: makeApiError('ALREADY_REGISTERED'),
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.getByTestId('error-banner-mock')).toBeInTheDocument();
expect(screen.getByTestId('error-banner-mock')).toHaveAttribute('data-code', 'ALREADY_REGISTERED');
    });

it('renders error banner for TOURNAMENT_FULL', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
registerState: 'error',
registerError: makeApiError('TOURNAMENT_FULL'),
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.getByTestId('error-banner-mock')).toBeInTheDocument();
    });

it('calls register when register button is clicked', async () => {
const mockRegister = vi.fn();
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isRegistered: false,
isEligible: true,
register: mockRegister,
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

const registerBtn = screen.getByTestId('tournament-cta-register');
fireEvent.click(registerBtn);

await waitFor(() => {
expect(mockRegister).toHaveBeenCalled();
      });
    });
  });

describe('loading state', () => {
it('renders nothing while loading participation data', () => {
mockUseTournamentRegistration.mockReturnValue(
makeMockResult({
isLoading: true,
        }),
      );

render(<TournamentRegistrationCta tournamentId="tournament-1" />);

expect(screen.queryByTestId('tournament-cta-register')).not.toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-withdraw')).not.toBeInTheDocument();
expect(screen.queryByTestId('tournament-cta-sign-in')).not.toBeInTheDocument();
    });
  });
});
