

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
useCursorPaginated,
type CursorFetcherArgs,
type CursorPage,
type UseCursorPaginatedResult,
} from '@/lib/api';
import { ApiError } from '@/lib/api/core/ApiError';

import { listTournaments } from '@/features/tournaments/services/tournaments.service';

import {
DEFAULT_TOURNAMENT_ADMIN_FILTERS,
TOURNAMENT_ADMIN_PAGE_SIZE,
type TournamentAdminFilters,
type TournamentDto,
} from '../admin-tournament-types';

export type TournamentAdminStatusFilter =
| ''
  | 'upcoming'
  | 'registration'
  | 'ongoing'
  | 'finished'
  | 'cancelled';

export const TOURNAMENT_ADMIN_STATUS_VALUES: readonly TournamentAdminStatusFilter[] =
Object.freeze([
'',
'upcoming',
'registration',
'ongoing',
'finished',
'cancelled',
  ] as const);

export const DEFAULT_TOURNAMENT_ADMIN_STATUS: TournamentAdminStatusFilter = '';

export function isTournamentAdminStatusFilter(
value: unknown,
): value is TournamentAdminStatusFilter {
return (
value === '' ||
value === 'upcoming' ||
value === 'registration' ||
value === 'ongoing' ||
value === 'finished' ||
value === 'cancelled'
  );
}

export function normalizeTournamentAdminStatusFilter(
value: unknown,
): TournamentAdminStatusFilter {
return isTournamentAdminStatusFilter(value)
? value
: DEFAULT_TOURNAMENT_ADMIN_STATUS;
}

export function tournamentAdminListKey(
status: TournamentAdminStatusFilter,
): readonly unknown[] {
return ['admin', 'tournaments', 'list', status];
}

export function tournamentAdminListKeyMatcher(key: unknown): boolean {
return (
Array.isArray(key) &&
key[0] === 'admin' &&
key[1] === 'tournaments'
  );
}

type ListTournamentsWireResponse = {
data?: unknown;
meta?: {
pagination?: {
kind?: string;
limit?: number;
nextCursor?: string | null;
hasNextPage?: boolean;
    };
  };
};

export interface UseTournamentAdminListResult {

items: (TournamentDto & { id: string })[];

isLoading: boolean;

isLoadingMore: boolean;

error: ApiError | null;

mutate: () => Promise<void>;

loadMore: () => void;

setFilter: (next: Pick<TournamentAdminFilters, 'status' | 'search'>) => void;

filter: Pick<TournamentAdminFilters, 'status' | 'search'>;
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function readStatusFromSearchParams(
searchParams: ReadonlyURLSearchParams | null,
): TournamentAdminStatusFilter {
if (searchParams === null) return DEFAULT_TOURNAMENT_ADMIN_STATUS;
return normalizeTournamentAdminStatusFilter(searchParams.get('status'));
}

function readQueryFromSearchParams(
searchParams: ReadonlyURLSearchParams | null,
): string {
if (searchParams === null) return '';
const raw = searchParams.get('q');
return typeof raw === 'string' ? raw : '';
}

function applyClientSearch(
items: (TournamentDto & { id: string })[],
query: string,
): (TournamentDto & { id: string })[] {
if (query.length === 0) return items;
const needle = query.toLowerCase();
return items.filter((item) => item.title.toLowerCase().includes(needle));
}

export function useTournamentAdminList(): UseTournamentAdminListResult {
const router = useRouter();
const searchParams = useSearchParams();

const status = useMemo<TournamentAdminStatusFilter>(
() => readStatusFromSearchParams(searchParams),
[searchParams],
  );

const query = useMemo<string>(
() => readQueryFromSearchParams(searchParams),
[searchParams],
  );

const filter = useMemo<
Pick<TournamentAdminFilters, 'status' | 'search'>
  >(
() => ({

status: status === '' ? undefined : status,
search: query,
    }),
[status, query],
  );

const key = useMemo(
() => tournamentAdminListKey(status),
[status],
  );

const fetcher = useCallback(
async ({
cursor,
    }: CursorFetcherArgs<Record<string, never>>): Promise<
CursorPage<TournamentDto & { id: string }>
    > => {
const wire = (await listTournaments({
...(cursor !== null ? { cursor } : {}),
...(status === '' ? {} : { status }),
limit: TOURNAMENT_ADMIN_PAGE_SIZE,
      })) as unknown as ListTournamentsWireResponse | undefined;

const rawItems = Array.isArray(wire?.data)
? (wire!.data as TournamentDto[])
: [];
const items = rawItems.map((item) => ({
...item,
id: item.tournamentId,
      }));

const pagination = wire?.meta?.pagination;
const page: CursorPage<TournamentDto & { id: string }> = {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? items.length,
      };
return page;
    },
[status],
  );

const paginated = useCursorPaginated<
TournamentDto & { id: string },
Record<string, never>
  >({
key,
fetcher,
params: {},
paginationKind: 'cursor',
  });

const setFilter = useCallback(
(next: Pick<TournamentAdminFilters, 'status' | 'search'>) => {
const nextStatus = normalizeTournamentAdminStatusFilter(
next.status === undefined || next.status === ('' as unknown as typeof next.status)
? ''
: next.status,
      );
const nextQuery = next.search;

const url = new URL(window.location.href);

if (nextStatus === DEFAULT_TOURNAMENT_ADMIN_STATUS) {
url.searchParams.delete('status');
      } else {
url.searchParams.set('status', nextStatus);
      }

if (nextQuery.length === 0) {
url.searchParams.delete('q');
      } else {
url.searchParams.set('q', nextQuery);
      }

const nextSearch = url.searchParams.toString();
router.replace(
nextSearch.length === 0
? url.pathname
: `${url.pathname}?${nextSearch}`,
{ scroll: false },
      );
    },
[router],
  );

const items = useMemo(
() => applyClientSearch([...paginated.items], query),
[paginated.items, query],
  );

return {
items,
isLoading: paginated.isLoading,
isLoadingMore: paginated.isLoadingMore,
error: paginated.error,
mutate: paginated.refresh,
loadMore: paginated.loadMore,
setFilter,
filter,
  };
}

export type { UseCursorPaginatedResult };

export { DEFAULT_TOURNAMENT_ADMIN_FILTERS };