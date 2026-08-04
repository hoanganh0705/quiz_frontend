/**
 * `useTournaments.spec.tsx` — locks the cursor-paginated tournament list hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.H1.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useTournaments } from '@/features/tournaments/hooks/useTournaments';

// Mock the feature flags
const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// Mock the service
const mockListTournaments = vi.fn();
vi.mock('@/features/tournaments/services/tournaments.service', () => ({
  listTournaments: (...args: unknown[]) => mockListTournaments(...args),
}));

const DEFAULT_FILTERS = { search: '', cursor: undefined, limit: undefined };

describe('useTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue('live');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('returns empty items when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

      const { result } = renderHook(() => useTournaments());

      expect(result.current.items).toEqual([]);
    });

    it('calls listTournaments with default filters', async () => {
      mockListTournaments.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useTournaments());

      await waitFor(() => {
        expect(result.current.items).toBeDefined();
      });

      expect(mockListTournaments).toHaveBeenCalledWith({});
    });
  });

  describe('pagination', () => {
    it('returns items from service response', async () => {
      const mockTournaments = [
        {
          tournamentId: 't1',
          title: 'Test Tournament 1',
          status: 'upcoming',
          difficulty: 'easy',
          startAt: '2024-01-01',
          endAt: '2024-01-31',
        },
        {
          tournamentId: 't2',
          title: 'Test Tournament 2',
          status: 'active',
          difficulty: 'medium',
          startAt: '2024-02-01',
          endAt: '2024-02-28',
        },
      ];

      mockListTournaments.mockResolvedValueOnce({
        data: mockTournaments,
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useTournaments());

      await waitFor(() => {
        expect(result.current.items.length).toBe(2);
      });

      expect(result.current.items[0]).toMatchObject({
        id: 't1',
        title: 'Test Tournament 1',
      });
    });

    it('handles cursor pagination correctly', async () => {
      mockListTournaments.mockResolvedValueOnce({
        data: [
          { tournamentId: 't1', title: 'Tournament 1', status: 'upcoming', difficulty: 'easy', startAt: '2024-01-01', endAt: '2024-01-31' },
        ],
        meta: { pagination: { limit: 20, nextCursor: 'cursor-2', hasNextPage: true } },
      });

      const { result } = renderHook(() => useTournaments({ search: '', cursor: 'cursor-1' }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('returns error from service', async () => {
      const error = { code: 'TOURNAMENT_NOT_FOUND', message: 'Not found', status: 404 };
      mockListTournaments.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTournaments());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});
