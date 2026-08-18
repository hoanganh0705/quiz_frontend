

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';

import { AuditLogErrorState } from '../AuditLogErrorState';

function makeApiError(opts: { code: string; requestId?: string }): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock error',
config: undefined,
request: undefined,
response: {
status: 500,
data: {
status: 500,
detail: 'mock detail',
title: 'Internal Server Error',
extensions: {
code: opts.code,
requestId: opts.requestId,
        },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('AuditLogErrorState', () => {
it('renders null when error is null', () => {
const { container } = render(
<AuditLogErrorState error={null} onRetry={vi.fn()} />,
    );

expect(container.firstChild).toBeNull();
  });

it('renders error state with priority copy', () => {
const error = makeApiError({ code: 'GLOBAL_INTERNAL_ERROR' });
render(<AuditLogErrorState error={error} onRetry={vi.fn()} />);

expect(screen.getByTestId('audit-log-error-state')).toBeInTheDocument();
expect(
screen.getByTestId('audit-log-error-state-title'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('audit-log-error-state-body'),
    ).toBeInTheDocument();
  });

it('exposes the error code via data-attribute', () => {
const error = makeApiError({ code: 'GLOBAL_INTERNAL_ERROR' });
render(<AuditLogErrorState error={error} onRetry={vi.fn()} />);

expect(
screen.getByTestId('audit-log-error-state').getAttribute('data-error-code'),
    ).toBe('GLOBAL_INTERNAL_ERROR');
  });

it('renders retry button when onRetry is provided', () => {
const error = makeApiError({ code: 'GLOBAL_INTERNAL_ERROR' });
render(<AuditLogErrorState error={error} onRetry={vi.fn()} />);

expect(
screen.getByTestId('audit-log-error-state-retry'),
    ).toBeInTheDocument();
  });

it('invokes onRetry when retry button is clicked', () => {
const onRetry = vi.fn();
const error = makeApiError({ code: 'GLOBAL_INTERNAL_ERROR' });
render(<AuditLogErrorState error={error} onRetry={onRetry} />);

fireEvent.click(screen.getByTestId('audit-log-error-state-retry'));

expect(onRetry).toHaveBeenCalled();
  });

it('renders request ID banner when error has requestId', () => {
const error = makeApiError({
code: 'GLOBAL_INTERNAL_ERROR',
requestId: 'req-abc-123',
    });
render(<AuditLogErrorState error={error} onRetry={vi.fn()} />);

expect(
screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });

it('renders NOT_EXPOSED copy when error code is AUDIT_LOG_NOT_EXPOSED', () => {
const error = makeApiError({ code: 'AUDIT_LOG_NOT_EXPOSED' });
render(<AuditLogErrorState error={error} onRetry={vi.fn()} />);

expect(
screen.getByTestId('audit-log-error-state-title'),
    ).toHaveTextContent(/audit log not available/i);
  });
});