

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import {
TOURNAMENT_CACHE_KEYS,
type TournamentListFilters,
} from '@/features/tournaments/types/tournament.types';

export const TOURNAMENT_ADMIN_LIST_PREFIX = 'tournament-admin:list' as const;

export interface TournamentAdminListKeyParams {
status?: string;
search?: string;
cursor?: string;
}

export function tournamentAdminListKey(params: TournamentListFilters = { search: '' }): string {
const parts: string[] = [TOURNAMENT_ADMIN_LIST_PREFIX];

if (params.status !== undefined && params.status) {
parts.push(`status=${params.status}`);
  }
if (params.search !== undefined && params.search.trim() !== '') {
parts.push(`q=${params.search.trim().toLowerCase()}`);
  }
if (params.cursor !== undefined) {
parts.push(`cursor=${params.cursor}`);
  }

return parts.join(':');
}

export const adminListKey = tournamentAdminListKey;

export function tournamentKey(tournamentId: string): readonly ['tournaments', 'detail', string] {
return TOURNAMENT_CACHE_KEYS.detail(tournamentId);
}

export const PUBLIC_TOURNAMENTS_PREFIX = 'tournaments:' as const;

export function publicTournamentKeyMatcher(key: unknown): boolean {
if (typeof key === 'string') {
return key.startsWith(PUBLIC_TOURNAMENTS_PREFIX);
  }
if (Array.isArray(key)) {
const head = key[0];
if (typeof head === 'string' && head === 'tournaments') {
return true;
    }

return key.some(
(segment) =>
typeof segment === 'string' && segment.startsWith(PUBLIC_TOURNAMENTS_PREFIX),
    );
  }
return false;
}

export function adminListKeyMatcher(key: unknown): boolean {
if (typeof key === 'string') {
return key.startsWith(TOURNAMENT_ADMIN_LIST_PREFIX);
  }
return false;
}

export function invalidateTournamentAdminList(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(adminListKeyMatcher) as unknown) as Promise<unknown[]>;
}

export function invalidateTournamentAdminListByParams(
params: TournamentListFilters,
mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
return mutate(tournamentAdminListKey(params)) as Promise<unknown>;
}

export function invalidateTournamentById(
tournamentId: string,
mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
const detailKey = tournamentKey(tournamentId);
return mutate(detailKey) as Promise<unknown>;
}

export function invalidatePublicTournamentCaches(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(publicTournamentKeyMatcher) as unknown) as Promise<unknown[]>;
}

export function invalidateAllTournamentCaches(
tournamentId: string,
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
void invalidateTournamentAdminList(mutate);
void invalidateTournamentById(tournamentId, mutate);
void invalidatePublicTournamentCaches(mutate);

return Promise.resolve([]);
}
