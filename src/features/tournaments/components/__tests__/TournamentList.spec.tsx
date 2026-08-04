/**
 * `TournamentList.spec.tsx` — tests for the TournamentList component.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.H2.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TournamentList } from '@/features/tournaments/components/TournamentList';
import type { UseTournamentsResult } from '@/features/tournaments/hooks/useTournaments';
import type { TournamentSummary } from '@/features/tournaments/types';

// Mock shared components
vi.mock('@/features/tournaments/components/shared', () => ({
  TournamentListSkeleton: () => <div data-testid="list-skeleton">Loading...</div>,
  TournamentEmptyState: vi.fn(({ variant }) => (
    <div data-testid="empty-state" data-variant={variant}>No items</div>
  )),
  TournamentErrorState: vi.fn(({ onRetry }) => (
    <div data-testid="error-state">
      Error
      <button onClick={onRetry}>Retry</button>
    </div>
  )),
  TournamentStaleState: vi.fn(({ onRetry }) => (
    <div data-testid="stale-state">
      Stale data
      <button onClick={onRetry}>Retry</button>
    </div>
  )),
}));

vi.mock('@/features/tournaments/components/TournamentCard', () => ({
  TournamentCard: ({ tournament }: { tournament: TournamentSummary }) => (
    <div data-testid="tournament-card" data-id={tournament.id}>{tournament.title}</div>
  ),
}));

function createMockTournament(overrides: Partial<TournamentSummary> = {}): TournamentSummary {
  return {
    tournamentId: 't1',
    title: 'Test Tournament',
    status: 'upcoming',
    difficulty: 'easy',
    startAt: '2024-01-01',
    endAt: '2024-01-31',
    ownerUserId: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    id: 't1',
    ...overrides,
  } as TournamentSummary;
}

function makeMockResult(overrides: Partial<UseTournamentsResult> = {}): UseTournamentsResult {
  return {
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    isStale: false,
    ...overrides,
  } as UseTournamentsResult;
}

describe('TournamentList', () => {
  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      const result = makeMockResult({ isLoading: true });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getByTestId('list-skeleton')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error state when error is present', () => {
      const error = { code: 'SERVER_ERROR', message: 'Server error', status: 500 } as unknown as NonNullable<UseTournamentsResult['error']>;
      const result = makeMockResult({ error });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('calls refresh when retry button is clicked', () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      const error = { code: 'SERVER_ERROR', message: 'Server error', status: 500 } as unknown as NonNullable<UseTournamentsResult['error']>;
      const result = makeMockResult({ error, refresh });
      render(<TournamentList tournamentsResult={result} />);

      fireEvent.click(screen.getByText('Retry'));

      expect(refresh).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('renders empty state when items is empty', () => {
      const result = makeMockResult({ items: [] });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders tournament cards for each item', () => {
      const result = makeMockResult({
        items: [
          createMockTournament({ id: '1', tournamentId: '1', title: 'Tournament 1', status: 'upcoming' }),
          createMockTournament({ id: '2', tournamentId: '2', title: 'Tournament 2', status: 'ongoing' }),
        ],
      });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getAllByTestId('tournament-card')).toHaveLength(2);
    });

    it('renders load more button when hasMore is true', () => {
      const result = makeMockResult({
        items: [createMockTournament({ id: '1', tournamentId: '1' })],
        hasMore: true,
      });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('calls loadMore when load more button is clicked', () => {
      const loadMore = vi.fn();
      const result = makeMockResult({
        items: [createMockTournament({ id: '1', tournamentId: '1' })],
        hasMore: true,
        loadMore,
      });
      render(<TournamentList tournamentsResult={result} />);

      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      expect(loadMore).toHaveBeenCalled();
    });
  });

  describe('stale state', () => {
    it('renders stale state banner when isStale is true', () => {
      const result = makeMockResult({
        items: [createMockTournament({ id: '1', tournamentId: '1' })],
        isStale: true,
      });
      render(<TournamentList tournamentsResult={result} />);

      expect(screen.getByTestId('stale-state')).toBeInTheDocument();
    });
  });
});
