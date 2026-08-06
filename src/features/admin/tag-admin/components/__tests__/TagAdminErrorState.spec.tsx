/**
 * `__tests__/TagAdminErrorState.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TagAdminErrorState } from '../TagAdminErrorState';
import type { ApiError } from '@/lib/api';

describe('TagAdminErrorState', () => {
  it('renders error title and message', () => {
    const error = {
      requestId: '',
      code: 'GLOBAL_INTERNAL_ERROR',
      detail: 'Server exploded',
    } as unknown as ApiError;

    render(<TagAdminErrorState error={error} onRetry={vi.fn()} />);

    expect(screen.getByText('Failed to load tags')).toBeInTheDocument();
    expect(screen.getByText(/exploded/i)).toBeInTheDocument();
  });

  it('renders the retry button and calls onRetry on click', () => {
    const onRetry = vi.fn();

    const error = {
      requestId: '',
      code: 'GLOBAL_INTERNAL_ERROR',
      detail: 'Boom',
    } as unknown as ApiError;

    render(<TagAdminErrorState error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Try Again'));

    expect(onRetry).toHaveBeenCalled();
  });
});
