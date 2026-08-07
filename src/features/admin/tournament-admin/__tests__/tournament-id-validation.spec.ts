/**
 * `features/admin/tournament-admin/__tests__/tournament-id-validation.spec.ts`
 *
 * Source epic:   Epic 7.7.
 * Source ticket: TKT-7.7.B4.
 *
 * Locks the structural invariants of `tournament-id-validation.ts`:
 *
 *   1. `TOURNAMENT_ID_UUID_REGEX` matches the canonical nil UUID v4 and
 *      other valid v4 ids (case-insensitive); rejects malformed ids.
 *   2. `validateTournamentId` is total: every input — valid, malformed,
 *      null, undefined, empty, non-string — returns a typed result.
 *   3. `isTournamentStartedForEdit` returns `true` for the documented
 *      edit-blocking statuses (`ongoing`, `finished`, `cancelled`) and
 *      `false` for the editable statuses (`upcoming`, `registration`).
 *   4. `validateTournamentCascade` is total: every input — partial,
 *      missing fields, non-object — returns a typed result; all three
 *      counts are accepted as `number | null`.
 */

import { describe, expect, it } from 'vitest';

import {
  TOURNAMENT_ID_UUID_REGEX,
  isTournamentStartedForEdit,
  validateTournamentCascade,
  validateTournamentId,
} from '../tournament-id-validation';

import type { TournamentDto } from '../admin-tournament-types';

import type { TournamentResponseDto } from '@/lib/api/generated/schemas';

describe('tournament-id-validation', () => {
  describe('TOURNAMENT_ID_UUID_REGEX', () => {
    it('matches the nil UUID v4', () => {
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBe(true);
    });

    it('matches additional valid v4 ids', () => {
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          '12345678-1234-4123-8123-123456789abc',
        ),
      ).toBe(true);
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          'abcdefab-cdef-4123-a456-1234567890ab',
        ),
      ).toBe(true);
    });

    it('matches case-insensitively', () => {
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          'ABCDEFAB-CDEF-4123-A456-1234567890AB',
        ),
      ).toBe(true);
    });

    it('rejects malformed ids', () => {
      expect(TOURNAMENT_ID_UUID_REGEX.test('not-a-uuid')).toBe(false);
      // Version nibble is [1-5] per RFC 4122; 6/7/8/9/a-f are invalid.
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          '00000000-0000-6000-8000-000000000000',
        ),
      ).toBe(false);
      // Variant nibble is [89ab] per RFC 4122; 0-7 are reserved/NCS.
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          '00000000-0000-4000-7000-000000000000',
        ),
      ).toBe(false);
      expect(
        TOURNAMENT_ID_UUID_REGEX.test(
          '00000000000040008000000000000000',
        ),
      ).toBe(false); // no dashes
      expect(TOURNAMENT_ID_UUID_REGEX.test('')).toBe(false);
    });
  });

  describe('validateTournamentId', () => {
    it('returns ok: true for a valid UUID v4', () => {
      expect(
        validateTournamentId('00000000-0000-4000-8000-000000000000'),
      ).toEqual({ ok: true });
    });

    it('returns invalid-uuid for malformed ids', () => {
      expect(validateTournamentId('not-a-uuid')).toEqual({
        ok: false,
        reason: 'invalid-uuid',
      });
      // Version nibble [1-5] — 6 is invalid.
      expect(
        validateTournamentId('00000000-0000-6000-8000-000000000000'),
      ).toEqual({
        ok: false,
        reason: 'invalid-uuid',
      });
    });

    it('returns not-a-string for non-string inputs', () => {
      expect(validateTournamentId(null)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateTournamentId(undefined)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateTournamentId(42)).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateTournamentId({})).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
      expect(validateTournamentId('')).toEqual({
        ok: false,
        reason: 'not-a-string',
      });
    });

    it('is total and never throws', () => {
      const inputs: unknown[] = [
        null,
        undefined,
        42,
        '',
        'not-a-uuid',
        '00000000-0000-4000-8000-000000000000',
        {},
        [],
        true,
        false,
      ];
      for (const input of inputs) {
        expect(() => validateTournamentId(input)).not.toThrow();
        const result = validateTournamentId(input);
        expect(typeof result.ok).toBe('boolean');
      }
    });
  });

  describe('isTournamentStartedForEdit', () => {
    /**
     * Build a minimal TournamentDto with the supplied status. The
     * helper is a typed narrowing helper for the `status` field; we
     * deliberately pass only that field via a cast so the spec stays
     * focused on the status guard.
     */
    function makeTournament(status: TournamentResponseDto['status']) {
      return { status } as Pick<TournamentDto, 'status'>;
    }

    it('returns true for the documented edit-blocking statuses', () => {
      expect(
        isTournamentStartedForEdit(makeTournament('ongoing')),
      ).toBe(true);
      expect(
        isTournamentStartedForEdit(makeTournament('finished')),
      ).toBe(true);
      expect(
        isTournamentStartedForEdit(makeTournament('cancelled')),
      ).toBe(true);
    });

    it('returns false for the editable statuses', () => {
      expect(
        isTournamentStartedForEdit(makeTournament('upcoming')),
      ).toBe(false);
      expect(
        isTournamentStartedForEdit(makeTournament('registration')),
      ).toBe(false);
    });
  });

  describe('validateTournamentCascade', () => {
    it('returns ok: true for a fully-populated cascade', () => {
      const result = validateTournamentCascade({
        participants: 10,
        rounds: 3,
        leaderboards: 1,
        hasMoreParticipants: false,
      });
      expect(result).toEqual({
        ok: true,
        cascade: {
          participants: 10,
          rounds: 3,
          leaderboards: 1,
          hasMoreParticipants: false,
        },
      });
    });

    it('returns ok: true for a cascade with all-null counts (TKT-7.7.A1 §2.4 verdict)', () => {
      const result = validateTournamentCascade({
        participants: null,
        rounds: null,
        leaderboards: null,
      });
      expect(result).toEqual({
        ok: true,
        cascade: {
          participants: null,
          rounds: null,
          leaderboards: null,
          hasMoreParticipants: undefined,
        },
      });
    });

    it('returns ok: true for a partial cascade (only some counts)', () => {
      const result = validateTournamentCascade({
        participants: 5,
        rounds: null,
        leaderboards: null,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cascade.participants).toBe(5);
        expect(result.cascade.rounds).toBeNull();
        expect(result.cascade.leaderboards).toBeNull();
      }
    });

    it('returns invalid-shape when a required field is missing', () => {
      expect(
        validateTournamentCascade({ participants: 10, rounds: 3 }),
      ).toEqual({
        ok: false,
        reason: 'invalid-shape',
      });
      expect(
        validateTournamentCascade({
          participants: 10,
          rounds: 3,
        }),
      ).toEqual({
        ok: false,
        reason: 'invalid-shape',
      });
      expect(
        validateTournamentCascade({}),
      ).toEqual({
        ok: false,
        reason: 'invalid-shape',
      });
    });

    it('returns invalid-shape when a count has an invalid type', () => {
      expect(
        validateTournamentCascade({
          participants: '10',
          rounds: 3,
          leaderboards: 1,
        }),
      ).toEqual({
        ok: false,
        reason: 'invalid-shape',
      });
    });

    it('returns not-an-object for non-object inputs', () => {
      expect(validateTournamentCascade(null)).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
      expect(validateTournamentCascade(undefined)).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
      expect(validateTournamentCascade(42)).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
      expect(validateTournamentCascade('cascade')).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
      // Arrays are objects, but the cascade is never an array.
      expect(validateTournamentCascade([])).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
    });

    it('is total and never throws', () => {
      const inputs: unknown[] = [
        null,
        undefined,
        42,
        '',
        {},
        [],
        { participants: 10, rounds: 3, leaderboards: 1 },
        { participants: null, rounds: null, leaderboards: null },
        { participants: 10, rounds: 3 },
      ];
      for (const input of inputs) {
        expect(() => validateTournamentCascade(input)).not.toThrow();
        const result = validateTournamentCascade(input);
        expect(typeof result.ok).toBe('boolean');
      }
    });
  });
});