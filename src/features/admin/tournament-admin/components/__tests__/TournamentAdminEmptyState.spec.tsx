/**
 * `TournamentAdminEmptyState` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D5 (AC #2).
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TournamentAdminEmptyState } from '../TournamentAdminEmptyState';

import type { TournamentAdminFilters } from '../../admin-tournament-types';

function makeFilter(
  overrides: Partial<TournamentAdminFilters> = {},
): TournamentAdminFilters {
  return {
    status: undefined,
    search: '',
    ...overrides,
  };
}

describe('TKT-7.7.D5 — TournamentAdminEmptyState: first-use mode', () => {
  it('AC #2: renders "no tournaments yet" when filter is empty', () => {
    render(<TournamentAdminEmptyState filter={makeFilter()} />);

    expect(
      screen.getByTestId('tournament-admin-empty'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('tournament-admin-empty-title'),
    ).toHaveTextContent('No tournaments yet');
    expect(
      screen.queryByTestId('tournament-admin-empty-filtered'),
    ).not.toBeInTheDocument();
  });

  it('AC #2: does not offer clear-filter CTA in first-use mode', () => {
    render(<TournamentAdminEmptyState filter={makeFilter()} />);

    expect(
      screen.queryByTestId('tournament-admin-empty-filtered-clear'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.7.D5 — TournamentAdminEmptyState: filtered mode', () => {
  it('AC #2: renders "no results" when status filter is non-empty', () => {
    render(
      <TournamentAdminEmptyState filter={makeFilter({ status: 'upcoming' })} />,
    );

    expect(
      screen.getByTestId('tournament-admin-empty-filtered'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('tournament-admin-empty'),
    ).not.toBeInTheDocument();
  });

  it('AC #2: renders "no results" when search filter is non-empty', () => {
    render(
      <TournamentAdminEmptyState filter={makeFilter({ search: 'spring' })} />,
    );

    expect(
      screen.getByTestId('tournament-admin-empty-filtered'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('tournament-admin-empty'),
    ).not.toBeInTheDocument();
  });

  it('AC #2: offers clear-filter CTA when filter is non-empty', () => {
    render(
      <TournamentAdminEmptyState
        filter={makeFilter({ status: 'upcoming' })}
        onClearFilter={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('tournament-admin-empty-filtered-clear'),
    ).toBeInTheDocument();
  });

  it('AC #2: clear-filter CTA invokes onClearFilter', () => {
    const onClearFilter = vi.fn();
    render(
      <TournamentAdminEmptyState
        filter={makeFilter({ search: 'spring' })}
        onClearFilter={onClearFilter}
      />,
    );

    fireEvent.click(
      screen.getByTestId('tournament-admin-empty-filtered-clear'),
    );

    expect(onClearFilter).toHaveBeenCalledTimes(1);
  });

  it('AC #2: does not offer clear-filter CTA when onClearFilter is absent', () => {
    render(
      <TournamentAdminEmptyState filter={makeFilter({ status: 'upcoming' })} />,
    );

    expect(
      screen.queryByTestId('tournament-admin-empty-filtered-clear'),
    ).not.toBeInTheDocument();
  });
});
