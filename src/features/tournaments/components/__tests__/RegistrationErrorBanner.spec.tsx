

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { RegistrationErrorBanner } from '@/features/tournaments/components/shared/RegistrationErrorBanner';
import { ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

vi.mock('@/lib/api/error-codes', () => ({
getUserCopy: vi.fn((code: string) => ({
title: `Error: ${code}`,
body: `Details for ${code}. Please try again.`,
toast: 'inline',
  })),
}));

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
data: {
type: 'about:blank',
title: `Error ${code}`,
status: 409,
code,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('RegistrationErrorBanner', () => {
describe('null error handling', () => {
it('renders nothing when error is null', () => {
const { container } = render(
<RegistrationErrorBanner error={null} />,
      );

expect(container.firstChild).toBeNull();
    });

it('renders nothing when error is undefined', () => {
const { container } = render(
<RegistrationErrorBanner error={undefined} />,
      );

expect(container.firstChild).toBeNull();
    });
  });

describe('error codes', () => {
const errorCodes = [
'ALREADY_REGISTERED',
'NOT_REGISTERED',
'TOURNAMENT_REGISTRATION_CLOSED',
'TOURNAMENT_FULL',
'TOURNAMENT_INELIGIBLE',
'UNAUTHORIZED',
'FORBIDDEN',
'CONFLICT',
'THROTTLED',
    ];

errorCodes.forEach((code) => {
it(`renders banner for error code: ${code}`, () => {
const error = makeApiError(code);
render(<RegistrationErrorBanner error={error} />);

expect(screen.getByTestId('registration-error-banner')).toBeInTheDocument();
      });

it(`renders non-empty title for error code: ${code}`, () => {
const error = makeApiError(code);
render(<RegistrationErrorBanner error={error} />);

const title = screen.getByTestId('registration-error-banner-title');
expect(title.textContent).toBeTruthy();
expect(title.textContent?.length).toBeGreaterThan(0);
      });

it(`renders non-empty body for error code: ${code}`, () => {
const error = makeApiError(code);
render(<RegistrationErrorBanner error={error} />);

const body = screen.getByTestId('registration-error-banner-body');
expect(body.textContent).toBeTruthy();
expect(body.textContent?.length).toBeGreaterThan(0);
      });
    });
  });

describe('ALREADY_REGISTERED info style', () => {
it('renders info/blue style for ALREADY_REGISTERED', () => {
const error = makeApiError('ALREADY_REGISTERED');
const { container } = render(<RegistrationErrorBanner error={error} />);

const banner = container.querySelector('[data-testid="registration-error-banner"]');
expect(banner).toBeInTheDocument();

expect(banner?.className).toMatch(/blue|bg-blue|text-blue/);
    });
  });

describe('dismiss functionality', () => {
it('calls onDismiss when dismiss button is clicked', () => {
const onDismiss = vi.fn();
const error = makeApiError('TOURNAMENT_FULL');
render(<RegistrationErrorBanner error={error} onDismiss={onDismiss} />);

const dismissButton = screen.getByTestId('registration-error-banner-dismiss');
fireEvent.click(dismissButton);

expect(onDismiss).toHaveBeenCalledTimes(1);
    });

it('does not render dismiss button when onDismiss is not provided', () => {
const error = makeApiError('TOURNAMENT_FULL');
render(<RegistrationErrorBanner error={error} />);

expect(screen.queryByTestId('registration-error-banner-dismiss')).not.toBeInTheDocument();
    });
  });

describe('ARIA attributes', () => {
it('has role="alert" for accessibility', () => {
const error = makeApiError('TOURNAMENT_FULL');
render(<RegistrationErrorBanner error={error} />);

const banner = screen.getByTestId('registration-error-banner');
expect(banner).toHaveAttribute('role', 'alert');
    });

it('has aria-live="assertive"', () => {
const error = makeApiError('TOURNAMENT_FULL');
render(<RegistrationErrorBanner error={error} />);

const banner = screen.getByTestId('registration-error-banner');
expect(banner).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
