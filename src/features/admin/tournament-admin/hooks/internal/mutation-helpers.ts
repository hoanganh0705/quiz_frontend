

import { ApiError } from '@/lib/api';

export function adminTournamentsKeyMatcher(key: unknown): boolean {
return (
Array.isArray(key) &&
key[0] === 'admin' &&
key[1] === 'tournaments'
  );
}

export function publicTournamentsKeyMatcher(key: unknown): boolean {
return (
Array.isArray(key) &&
key[0] === 'tournaments' &&
key[1] === 'list'
  );
}

export function publicTournamentDetailKeyMatcher(
key: unknown,
tournamentId: string,
): boolean {
return (
Array.isArray(key) &&
key[0] === 'tournaments' &&
key[1] === 'detail' &&
key[2] === tournamentId
  );
}

export function nowMs(): number {
return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

