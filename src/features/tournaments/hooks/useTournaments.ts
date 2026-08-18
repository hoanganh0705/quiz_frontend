"use client";

import { useMemo } from "react";

import {
ApiError,
projectWithId,
useCursorPaginated,
} from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
} from "@/lib/api/use-cursor-paginated.types";

import {
listTournaments,
} from "@/features/tournaments/services/tournaments.service";
import {
TOURNAMENT_CACHE_KEYS,
DEFAULT_TOURNAMENT_LIST_FILTERS,
type TournamentListFilters,
type TournamentListPage,
type TournamentSummary,
} from "@/features/tournaments/types/tournament.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
TournamentControllerListTournaments200AllOf,
} from "@/lib/api/generated/schemas";

export interface UseTournamentsResult {
items: readonly TournamentSummary[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;

isStale: boolean;
}

type ListTournamentsWireResponse = TournamentControllerListTournaments200AllOf;

export function useTournaments(
filters: TournamentListFilters = DEFAULT_TOURNAMENT_LIST_FILTERS,
): UseTournamentsResult {
const flagValue = getFeatureFlagValue("tournaments_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder
? (["tournaments", "list", "disabled"] as const)
: TOURNAMENT_CACHE_KEYS.list(filters),
[isFlagPlaceholder, filters],
  );

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<TournamentListFilters>): Promise<TournamentListPage> => {

if (isFlagPlaceholder) {
return {
items: [],
nextCursor: null,
hasNextPage: false,
limit: 0,
          };
        }

const effectiveCursor = cursor ?? filters.cursor ?? undefined;

const wire = (await listTournaments({
...(effectiveCursor ? { cursor: effectiveCursor } : {}),
...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
        })) as unknown as ListTournamentsWireResponse;

const items = projectWithId((wire.data ?? []) as unknown as readonly Record<string, unknown>[], 'tournamentId') as any;

const pagination = wire.meta?.pagination;
const limit = pagination?.limit ?? items.length;
return {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit,
        };
      },
[isFlagPlaceholder, filters],
  );

const result = useCursorPaginated<TournamentSummary, TournamentListFilters>({
key,
fetcher,
params: filters,
paginationKind: "cursor",
  });

return {
items: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
refresh: result.refresh,
isStale: false, // TODO: wire stale-data tracking when Epic 5.1 SWR stale hook lands
  };
}

export type { TournamentListPage };
