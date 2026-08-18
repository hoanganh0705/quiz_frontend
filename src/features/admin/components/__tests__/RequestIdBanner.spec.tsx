

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';

import { RequestIdBanner } from '../RequestIdBanner';

function makeApiError(extensions: {
requestId?: string;
correlationId?: string;
}): ApiError {
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
detail: 'server error',
title: 'Internal Server Error',
extensions,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('RequestIdBanner', () => {
it('renders null when error is null', () => {
const { container } = render(<RequestIdBanner error={null} />);
expect(container.firstChild).toBeNull();
  });

it('renders null when error has no requestId', () => {
const error = makeApiError({});
const { container } = render(<RequestIdBanner error={error} />);
expect(container.firstChild).toBeNull();
  });

it('renders requestId only when correlationId is absent', () => {
const error = makeApiError({ requestId: 'req-abc-123' });
render(<RequestIdBanner error={error} />);

expect(screen.getByTestId('admin-request-id-banner')).toBeInTheDocument();
expect(
screen.getByTestId('admin-request-id-banner-request-id'),
    ).toHaveTextContent('req-abc-123');
expect(
screen.queryByTestId('admin-request-id-banner-correlation-id'),
    ).not.toBeInTheDocument();
  });

it('renders both requestId and correlationId when both are present', () => {
const error = makeApiError({
requestId: 'req-abc-123',
correlationId: 'corr-xyz-789',
    });
render(<RequestIdBanner error={error} />);

expect(
screen.getByTestId('admin-request-id-banner-request-id'),
    ).toHaveTextContent('req-abc-123');
expect(
screen.getByTestId('admin-request-id-banner-correlation-id'),
    ).toHaveTextContent('corr-xyz-789');
  });

it('never renders raw payload content', () => {
const error = new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock error',
config: undefined,
request: undefined,
response: {
status: 500,
data: {
status: 500,
detail: 'a top-secret token leaked',
title: 'Internal Server Error',
extensions: { requestId: 'req-abc-123' },
        },
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
const { container } = render(<RequestIdBanner error={error} />);
const html = container.innerHTML;
expect(html).not.toMatch(/top-secret|token leaked/);
  });
});
