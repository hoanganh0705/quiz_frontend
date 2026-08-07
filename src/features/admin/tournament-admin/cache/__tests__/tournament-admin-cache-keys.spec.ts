/**
 * `tournament-admin-cache-keys.spec.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.G1.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TOURNAMENT_ADMIN_LIST_PREFIX,
  PUBLIC_TOURNAMENTS_PREFIX,
  tournamentAdminListKey,
  adminListKey,
  tournamentKey,
  publicTournamentKeyMatcher,
  adminListKeyMatcher,
  invalidateTournamentAdminList,
  invalidateTournamentAdminListByParams,
  invalidateTournamentById,
  invalidatePublicTournamentCaches,
  invalidateAllTournamentCaches,
} from '../tournament-admin-cache-keys';

describe('TournamentAdminCacheKeys', () => {
  describe('tournamentAdminListKey', () => {
    it('returns the base prefix for empty params', () => {
      expect(tournamentAdminListKey({})).toBe('tournament-admin:list');
    });

    it('includes status when provided', () => {
      expect(tournamentAdminListKey({ status: 'upcoming' })).toBe(
        'tournament-admin:list:status=upcoming',
      );
    });

    it('includes search when provided', () => {
      expect(tournamentAdminListKey({ search: 'spring' })).toBe(
        'tournament-admin:list:q=spring',
      );
    });

    it('includes cursor when provided', () => {
      expect(tournamentAdminListKey({ cursor: 'abc123' })).toBe(
        'tournament-admin:list:cursor=abc123',
      );
    });

    it('includes multiple params in order', () => {
      expect(
        tournamentAdminListKey({ status: 'ongoing', search: 'championship' }),
      ).toBe('tournament-admin:list:status=ongoing:q=championship');
    });

    it('normalizes search to lowercase', () => {
      expect(tournamentAdminListKey({ search: 'Spring CUP' })).toBe(
        'tournament-admin:list:q=spring cup',
      );
    });

    it('trims search whitespace', () => {
      expect(tournamentAdminListKey({ search: '  spring  ' })).toBe(
        'tournament-admin:list:q=spring',
      );
    });

    it('omits undefined status', () => {
      expect(
        tournamentAdminListKey({ status: undefined, search: 'test' }),
      ).toBe('tournament-admin:list:q=test');
    });

    it('omits empty string status', () => {
      expect(tournamentAdminListKey({ status: '', search: 'test' })).toBe(
        'tournament-admin:list:q=test',
      );
    });

    it('omits empty search', () => {
      expect(tournamentAdminListKey({ search: '' })).toBe(
        'tournament-admin:list',
      );
    });
  });

  describe('adminListKey (alias)', () => {
    it('is an alias for tournamentAdminListKey', () => {
      expect(adminListKey).toBe(tournamentAdminListKey);
    });
  });

  describe('tournamentKey', () => {
    it('returns the Phase 5 detail key format', () => {
      const id = '00000000-0000-4000-8000-000000000001';
      expect(tournamentKey(id)).toEqual([
        'tournaments',
        'detail',
        id,
      ]);
    });
  });

  describe('adminListKeyMatcher', () => {
    it('matches admin list keys', () => {
      expect(adminListKeyMatcher('tournament-admin:list')).toBe(true);
      expect(adminListKeyMatcher('tournament-admin:list:status=upcoming')).toBe(
        true,
      );
    });

    it('does not match non-admin keys', () => {
      expect(adminListKeyMatcher('tournaments:list:...')).toBe(false);
      expect(adminListKeyMatcher('tag-admin:list')).toBe(false);
    });

    it('does not match array keys', () => {
      expect(adminListKeyMatcher(['tournaments', 'list'])).toBe(false);
    });
  });

  describe('publicTournamentKeyMatcher', () => {
    it('matches string keys with tournaments: prefix', () => {
      expect(publicTournamentKeyMatcher('tournaments:list:...')).toBe(true);
      expect(
        publicTournamentKeyMatcher('tournaments:detail:00000000-0000-4000-8000-000000000001'),
      ).toBe(true);
    });

    it('matches array keys with tournaments as first element', () => {
      expect(publicTournamentKeyMatcher(['tournaments', 'list', '...'])).toBe(
        true,
      );
      expect(
        publicTournamentKeyMatcher([
          'tournaments',
          'detail',
          '00000000-0000-4000-8000-000000000001',
        ]),
      ).toBe(true);
    });

    it('does not match non-tournament keys', () => {
      expect(publicTournamentKeyMatcher('tag-admin:list')).toBe(false);
      expect(publicTournamentKeyMatcher(['tags', 'list'])).toBe(false);
    });

    it('handles nested prefixes in array keys', () => {
      expect(
        publicTournamentKeyMatcher(['nested', 'tournaments:list', '...']),
      ).toBe(true);
    });
  });

  describe('invalidation helpers', () => {
    const mockMutate = vi.fn().mockResolvedValue([]);

    beforeEach(() => {
      mockMutate.mockClear();
    });

    describe('invalidateTournamentAdminList', () => {
      it('calls mutate with the admin list key matcher', async () => {
        await invalidateTournamentAdminList(mockMutate);
        expect(mockMutate).toHaveBeenCalledWith(adminListKeyMatcher);
      });
    });

    describe('invalidateTournamentAdminListByParams', () => {
      it('calls mutate with the specific key', async () => {
        await invalidateTournamentAdminListByParams(
          { status: 'upcoming' },
          mockMutate,
        );
        expect(mockMutate).toHaveBeenCalledWith(
          'tournament-admin:list:status=upcoming',
        );
      });
    });

    describe('invalidateTournamentById', () => {
      it('calls mutate with the tournament detail key', async () => {
        const id = '00000000-0000-4000-8000-000000000001';
        await invalidateTournamentById(id, mockMutate);
        expect(mockMutate).toHaveBeenCalledWith([
          'tournaments',
          'detail',
          id,
        ]);
      });
    });

    describe('invalidatePublicTournamentCaches', () => {
      it('calls mutate with the public tournament key matcher', async () => {
        await invalidatePublicTournamentCaches(mockMutate);
        expect(mockMutate).toHaveBeenCalledWith(
          publicTournamentKeyMatcher,
        );
      });
    });

    describe('invalidateAllTournamentCaches', () => {
      it('calls mutate for admin list, detail, and public caches', async () => {
        const id = '00000000-0000-4000-8000-000000000001';
        await invalidateAllTournamentCaches(id, mockMutate);

        // Should call mutate three times
        expect(mockMutate).toHaveBeenCalledTimes(3);
        expect(mockMutate).toHaveBeenCalledWith(adminListKeyMatcher);
        expect(mockMutate).toHaveBeenCalledWith(['tournaments', 'detail', id]);
        expect(mockMutate).toHaveBeenCalledWith(publicTournamentKeyMatcher);
      });
    });
  });

  describe('constants', () => {
    it('exports the correct admin list prefix', () => {
      expect(TOURNAMENT_ADMIN_LIST_PREFIX).toBe('tournament-admin:list');
    });

    it('exports the correct public tournaments prefix', () => {
      expect(PUBLIC_TOURNAMENTS_PREFIX).toBe('tournaments:');
    });
  });
});
