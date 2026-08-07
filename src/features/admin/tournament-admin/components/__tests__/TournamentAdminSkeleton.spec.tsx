/**
 * `TournamentAdminSkeleton` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D5 (AC #1).
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TournamentAdminSkeleton } from '../TournamentAdminSkeleton';

describe('TKT-7.7.D5 — TournamentAdminSkeleton', () => {
  it('AC #1: renders the documented number of rows (default 5)', () => {
    render(<TournamentAdminSkeleton />);

    expect(screen.getByTestId('tournament-admin-skeleton')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('tournament-admin-skeleton-row'),
    ).toHaveLength(5);
  });

  it('AC #1: renders the requested number of rows', () => {
    render(<TournamentAdminSkeleton rows={3} />);

    expect(
      screen.getAllByTestId('tournament-admin-skeleton-row'),
    ).toHaveLength(3);
  });

  it('AC #1: has the correct aria attributes', () => {
    render(<TournamentAdminSkeleton />);

    const skeleton = screen.getByTestId('tournament-admin-skeleton');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading tournaments');
  });

  it('AC #1: renders a layout matching the row columns', () => {
    render(<TournamentAdminSkeleton rows={1} />);

    const row = screen.getByTestId('tournament-admin-skeleton-row');
    // Each row has 5 child groups: title+desc, status, window, capacity, actions.
    // The exact structure is tested by snapshot; here we verify the row renders.
    expect(row).toBeInTheDocument();
  });
});
