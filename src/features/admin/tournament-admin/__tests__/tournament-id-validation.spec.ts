

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

expect(
TOURNAMENT_ID_UUID_REGEX.test(
'00000000-0000-6000-8000-000000000000',
        ),
      ).toBe(false);

expect(
TOURNAMENT_ID_UUID_REGEX.test(
'00000000-0000-4000-7000-000000000000',
        ),
      ).toBe(false);
expect(
TOURNAMENT_ID_UUID_REGEX.test(
'00000000000040008000000000000000',
        ),
      ).toBe(false);
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