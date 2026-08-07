/**
 * `TournamentAdminErrorState` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D5 (AC #3).
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TournamentAdminErrorState } from '../TournamentAdminErrorState';

import { ApiError } from '@/lib/api/core/ApiError';

function makeApiError(
  code: string,
  requestId = 'req-abc',
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: code,
    config: undefined,
    request: undefined,
    response: {
      status: 500,
      data: {
        status: 500,
        detail: code,
        title: code,
        extensions: { code, requestId },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

describe('TKT-7.7.D5 — TournamentAdminErrorState', () => {
  it('AC #3: renders the typed error code', () => {
    const error = makeApiError('TOURNAMENT_LIST_FAILED');
    render(<TournamentAdminErrorState error={error} onRetry={vi.fn()} />);

    expect(
      screen.getByTestId('tournament-admin-error-state-code'),
    ).toHaveTextContent('TOURNAMENT_LIST_FAILED');
  });

  it('AC #3: clicking retry invokes onRetry', () => {
    const onRetry = vi.fn();
    const error = makeApiError('INTERNAL_SERVER_ERROR');
    render(<TournamentAdminErrorState error={error} onRetry={onRetry} />);

    fireEvent.click(
      screen.getByTestId('tournament-admin-error-state-retry'),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('AC #3: renders RequestIdBanner when error has a requestId', () => {
    const error = makeApiError('INTERNAL_SERVER_ERROR', 'req-xyz');
    render(<TournamentAdminErrorState error={error} onRetry={vi.fn()} />);

    expect(
      screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });

  it('AC #3: does not render RequestIdBanner when error has no requestId', () => {
    const error = makeApiError('INTERNAL_SERVER_ERROR', '');
    render(<TournamentAdminErrorState error={error} onRetry={vi.fn()} />);

    expect(
      screen.queryByTestId('admin-request-id-banner'),
    ).not.toBeInTheDocument();
  });
});
