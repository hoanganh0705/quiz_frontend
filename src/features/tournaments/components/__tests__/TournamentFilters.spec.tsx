/**
 * `TournamentFilters.spec.tsx` — tests for the TournamentFilters component.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.H2.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TournamentFilters } from '@/features/tournaments/components/TournamentFilters';
import type { TournamentListFilters } from '@/features/tournaments/types';

// Mock
const onFilterChangeMock = vi.fn();
const onResetMock = vi.fn();

function makeFilters(
  overrides: Partial<TournamentListFilters> = {},
): TournamentListFilters {
  return {
    status: undefined,
    search: '',
    cursor: undefined,
    ...overrides,
  };
}

describe('TournamentFilters', () => {
  beforeEach(() => {
    onFilterChangeMock.mockReset();
    onResetMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('status tabs', () => {
    it('renders all four status tabs', () => {
      render(
        <TournamentFilters
          filters={makeFilters()}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    });

    it('calls onFilterChange when a tab is clicked', () => {
      render(
        <TournamentFilters
          filters={makeFilters()}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /upcoming/i }));

      expect(onFilterChangeMock).toHaveBeenCalledWith('status', 'upcoming');
    });

    it('clears status when All tab is clicked', () => {
      render(
        <TournamentFilters
          filters={makeFilters({ status: 'ongoing' })}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /all/i }));

      expect(onFilterChangeMock).toHaveBeenCalledWith('status', undefined);
    });
  });

  describe('search input', () => {
    it('renders search input', () => {
      render(
        <TournamentFilters
          filters={makeFilters()}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      const input = screen.getByPlaceholderText(/search tournaments/i);
      expect(input).toBeInTheDocument();
    });

    it('updates local state immediately', () => {
      render(
        <TournamentFilters
          filters={makeFilters()}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      const input = screen.getByPlaceholderText(/search tournaments/i);
      fireEvent.change(input, { target: { value: 'test' } });

      expect((input as HTMLInputElement).value).toBe('test');
    });
  });

  describe('reset button', () => {
    it('is disabled when no filters are active', () => {
      render(
        <TournamentFilters
          filters={makeFilters()}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeDisabled();
    });

    it('is enabled when a filter is active', () => {
      render(
        <TournamentFilters
          filters={makeFilters({ status: 'upcoming' })}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).not.toBeDisabled();
    });

    it('calls onReset when clicked', () => {
      render(
        <TournamentFilters
          filters={makeFilters({ status: 'ongoing' })}
          onFilterChange={onFilterChangeMock}
          onReset={onResetMock}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /reset/i }));

      expect(onResetMock).toHaveBeenCalled();
    });
  });
});
