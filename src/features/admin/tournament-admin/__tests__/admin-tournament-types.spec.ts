/**
 * `features/admin/tournament-admin/__tests__/admin-tournament-types.spec.ts`
 *
 * Source epic:   Epic 7.7.
 * Source ticket: TKT-7.7.B1.
 *
 * Locks the structural invariants of `admin-tournament-types.ts`:
 *
 *   1. `TOURNAMENT_ADMIN_PAGE_SIZE === 20`.
 *   2. `DEFAULT_TOURNAMENT_ADMIN_FILTERS` has the documented empty
 *      shape (no status, empty search, no cursor, limit = page size).
 *   3. `TournamentAdminFilters.status` lists every documented
 *      `TournamentStatus` value (`upcoming | registration | ongoing |
 *      finished | cancelled`).
 *   4. `TournamentCascadeDto` is structurally `{ participants, rounds,
 *      leaderboards }` with all three counts nullable, plus an
 *      optional `hasMoreParticipants` flag.
 *   5. The type aliases (`TournamentCreateDto` ↔ `CreateTournamentDto`,
 *      `TournamentUpdateDto` ↔ `UpdateTournamentDto`,
 *      `TournamentListDto` ↔ `TournamentControllerListTournaments200`)
 *      are structural identities — the spec confirms the alias chain
 *      is non-redefining (no new required fields are introduced).
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TOURNAMENT_ADMIN_FILTERS,
  TOURNAMENT_ADMIN_PAGE_SIZE,
  type TournamentAdminFilters,
  type TournamentCascadeDto,
  type TournamentCreateDto,
  type TournamentListDto,
  type TournamentUpdateDto,
} from '../admin-tournament-types';

import type {
  CreateTournamentDto,
  TournamentControllerListTournaments200,
  UpdateTournamentDto,
} from '@/lib/api/generated/schemas';

describe('admin-tournament-types', () => {
  describe('TOURNAMENT_ADMIN_PAGE_SIZE', () => {
    it('is the documented 20-row default', () => {
      expect(TOURNAMENT_ADMIN_PAGE_SIZE).toBe(20);
    });

    it('is the literal type `20` so consumers can rely on the constant', () => {
      // Compile-time lock — the `as const` assertion narrows the
      // type to `20`; if a future edit drops the `as const` the
      // assignment below fails with TS2322.
      const literal: 20 = TOURNAMENT_ADMIN_PAGE_SIZE;
      expect(literal).toBe(20);
    });
  });

  describe('DEFAULT_TOURNAMENT_ADMIN_FILTERS', () => {
    it('has the documented empty filter shape', () => {
      expect(DEFAULT_TOURNAMENT_ADMIN_FILTERS).toEqual({
        status: undefined,
        search: '',
        cursor: undefined,
        limit: TOURNAMENT_ADMIN_PAGE_SIZE,
      });
    });

    it('limit defaults to TOURNAMENT_ADMIN_PAGE_SIZE', () => {
      expect(DEFAULT_TOURNAMENT_ADMIN_FILTERS.limit).toBe(
        TOURNAMENT_ADMIN_PAGE_SIZE,
      );
    });
  });

  describe('TournamentAdminFilters.status union', () => {
    it('lists every documented TournamentStatus value', () => {
      const filters: TournamentAdminFilters = {
        search: '',
      };
      const statuses: NonNullable<TournamentAdminFilters['status']>[] = [
        'upcoming',
        'registration',
        'ongoing',
        'finished',
        'cancelled',
      ];
      expect(statuses).toHaveLength(5);
      for (const status of statuses) {
        filters.status = status;
        // Confirms every documented value is assignable.
        expect(filters.status).toBe(status);
      }
    });

    it('rejects statuses outside the documented union (compile-time)', () => {
      // Compile-time lock: the `@ts-expect-error` directive flags
      // TypeScript at build time if the union is ever widened to
      // include `'scheduled'` (the value the source story mentioned
      // but which does not match the documented backend enum).
      //
      //   @ts-expect-error — "scheduled" is not in the documented
      //   `TournamentAdminFilters.status` union.
      const _notAllowed: TournamentAdminFilters['status'] = 'scheduled';
      // Runtime assertion: confirms the literal reaches the variable
      // unmolested (TypeScript widens the literal to `string` for
      // the expect-error branch).
      expect(_notAllowed).toBe('scheduled');
    });
  });

  describe('TournamentCascadeDto', () => {
    it('accepts the documented shape with all-null counts', () => {
      const cascade: TournamentCascadeDto = {
        participants: null,
        rounds: null,
        leaderboards: null,
      };
      expect(cascade.participants).toBeNull();
      expect(cascade.rounds).toBeNull();
      expect(cascade.leaderboards).toBeNull();
    });

    it('accepts a fully-populated embedded cascade', () => {
      const cascade: TournamentCascadeDto = {
        participants: 42,
        rounds: 3,
        leaderboards: 1,
        hasMoreParticipants: false,
      };
      expect(cascade.participants).toBe(42);
      expect(cascade.rounds).toBe(3);
      expect(cascade.leaderboards).toBe(1);
      expect(cascade.hasMoreParticipants).toBe(false);
    });

    it('marks a truncated cascade with hasMoreParticipants = true', () => {
      const cascade: TournamentCascadeDto = {
        participants: 100,
        rounds: 5,
        leaderboards: 1,
        hasMoreParticipants: true,
      };
      expect(cascade.hasMoreParticipants).toBe(true);
    });
  });

  describe('type-alias identity (compile-time lock)', () => {
    it('TournamentCreateDto is structurally identical to CreateTournamentDto', () => {
      // The assignment below forces TypeScript to verify the alias
      // is a structural identity, not a redefinition. If a future
      // edit adds a new required field to `TournamentCreateDto`
      // without adding it to `CreateTournamentDto`, the assignment
      // fails with TS2322.
      const sample: CreateTournamentDto = {
        title: 'Sample tournament',
        difficulty: 'medium',
        startAt: '2026-09-01T12:00:00Z',
        endAt: '2026-09-02T12:00:00Z',
      };
      const aliased: TournamentCreateDto = sample;
      expect(aliased.title).toBe('Sample tournament');
    });

    it('TournamentUpdateDto is structurally identical to UpdateTournamentDto', () => {
      const sample: UpdateTournamentDto = {
        title: 'Updated title',
      };
      const aliased: TournamentUpdateDto = sample;
      expect(aliased.title).toBe('Updated title');
    });

    it('TournamentListDto is structurally identical to TournamentControllerListTournaments200', () => {
      const sample: TournamentControllerListTournaments200 = {
        data: [],
        meta: { timestamp: '2026-08-07T12:00:00Z', pagination: undefined },
      };
      const aliased: TournamentListDto = sample;
      expect(aliased.data).toEqual([]);
      expect(aliased.meta?.timestamp).toBe('2026-08-07T12:00:00Z');
    });
  });
});