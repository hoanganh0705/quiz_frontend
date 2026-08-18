

import type { TournamentDto } from './admin-tournament-types';
import type { TournamentCascadeDto } from './admin-tournament-types';

const UUID_V4_REGEX_SOURCE =
'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export const TOURNAMENT_ID_UUID_REGEX: RegExp = new RegExp(
UUID_V4_REGEX_SOURCE,
'i',
);

export type TournamentIdValidationReason =

| 'not-a-string'
  /** The input was a string but did not match the UUID v4 regex. */
  | 'invalid-uuid';

export type TournamentIdValidationResult =
| { ok: true }
  | { ok: false; reason: TournamentIdValidationReason };

export function validateTournamentId(
value: unknown,
): TournamentIdValidationResult {
if (typeof value !== 'string') {
return { ok: false, reason: 'not-a-string' };
  }
if (value.length === 0) {
return { ok: false, reason: 'not-a-string' };
  }
if (!TOURNAMENT_ID_UUID_REGEX.test(value)) {
return { ok: false, reason: 'invalid-uuid' };
  }
return { ok: true };
}

const EDIT_BLOCKING_STATUSES = new Set<string>([
'ongoing',
'finished',
'cancelled',
]);

export function isTournamentStartedForEdit(
tournament: Pick<TournamentDto, 'status'>,
): boolean {
return EDIT_BLOCKING_STATUSES.has(tournament.status);
}

export type TournamentCascadeValidationReason =

| 'not-an-object'
  /** The object was missing one or more required numeric fields. */
  | 'invalid-shape';

export type TournamentCascadeValidationResult =
| { ok: true; cascade: TournamentCascadeDto }
  | { ok: false; reason: TournamentCascadeValidationReason };

export function validateTournamentCascade(
value: unknown,
): TournamentCascadeValidationResult {
if (value === null || typeof value !== 'object' || Array.isArray(value)) {
return { ok: false, reason: 'not-an-object' };
  }
const candidate = value as Record<string, unknown>;
if (
!('participants' in candidate) ||
!('rounds' in candidate) ||
!('leaderboards' in candidate)
  ) {
return { ok: false, reason: 'invalid-shape' };
  }

const participants = candidate.participants;
const rounds = candidate.rounds;
const leaderboards = candidate.leaderboards;
const isCount = (v: unknown) => v === null || typeof v === 'number';
if (!isCount(participants) || !isCount(rounds) || !isCount(leaderboards)) {
return { ok: false, reason: 'invalid-shape' };
  }
return {
ok: true,
cascade: {
participants: participants as number | null,
rounds: rounds as number | null,
leaderboards: leaderboards as number | null,
hasMoreParticipants:
typeof candidate.hasMoreParticipants === 'boolean'
? candidate.hasMoreParticipants
: undefined,
    },
  };
}