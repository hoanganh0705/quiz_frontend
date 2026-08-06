/**
 * `__tests__/CategoryAdminErrorState.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.D3.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { CategoryAdminErrorState } from '../CategoryAdminErrorState';

function makeError(): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status: 500,
      data: {
        detail: 'Server exploded',
        extensions: {
          code: 'GLOBAL_INTERNAL_ERROR',
          requestId: 'req-123',
        },
      },
    },
  } as never);
}

describe('CategoryAdminErrorState', () => {
  it('renders the failed-to-load copy and a retry button', () => {
    const onRetry = vi.fn();
    render(
      <CategoryAdminErrorState error={makeError()} onRetry={onRetry} />,
    );

    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Try Again/ }),
    ).toBeInTheDocument();
  });

  it('renders the error detail when available', () => {
    render(<CategoryAdminErrorState error={makeError()} onRetry={vi.fn()} />);

    expect(screen.getByText(/Server exploded/)).toBeInTheDocument();
  });

  it('invokes onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <CategoryAdminErrorState error={makeError()} onRetry={onRetry} />,
    );

    screen.getByRole('button', { name: /Try Again/ }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});