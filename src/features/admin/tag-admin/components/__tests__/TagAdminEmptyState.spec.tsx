/**
 * `__tests__/TagAdminEmptyState.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TagAdminEmptyState } from '../TagAdminEmptyState';

describe('TagAdminEmptyState', () => {
  it('renders "No tags yet" for active tab', () => {
    render(<TagAdminEmptyState tab='active' />);
    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
  });

  it('renders "No soft-deleted tags" for deleted tab', () => {
    render(<TagAdminEmptyState tab='deleted' />);
    expect(screen.getByText(/no soft-deleted tags/i)).toBeInTheDocument();
  });

  it('renders CTA button when onCreate is provided for active tab', () => {
    render(<TagAdminEmptyState tab='active' onCreate={vi.fn()} />);
    expect(screen.getByText('Add Tag')).toBeInTheDocument();
  });

  it('does not render CTA button on deleted tab', () => {
    render(<TagAdminEmptyState tab='deleted' />);
    expect(screen.queryByText('Add Tag')).not.toBeInTheDocument();
  });
});
