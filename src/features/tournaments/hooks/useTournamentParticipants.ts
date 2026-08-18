"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getTournamentParticipants } from "@/features/tournaments/services/tournaments.service";
import {
TOURNAMENT_CACHE_KEYS,
type TournamentParticipantsFilters,
type TournamentParticipantsPage,
type TournamentParticipant,
} from "@/features/tournaments/types/tournament.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseTournamentParticipantsResult {
items: readonly TournamentParticipant[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;
}

type GetTournamentParticipantsWireResponse = {
data?: unknown[];
meta?: {
pagination?: {
kind: string;
page?: number;
total?: number;
hasMore?: boolean;
    };
  };
};

const DEFAULT_LIMIT = 20;

export function useTournamentParticipants(
tournamentId: string | null,
filters: TournamentParticipantsFilters = {},
): UseTournamentParticipantsResult {
const flagValue = getFeatureFlagValue("tournaments_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder || tournamentId === null
? (["tournaments", "participants", "disabled"] as const)
: TOURNAMENT_CACHE_KEYS.participants(tournamentId, filters),
[isFlagPlaceholder, tournamentId, filters],
  );

const fetcher = useMemo(
() =>
async ({
page,
      }: OffsetFetcherArgs<TournamentParticipantsFilters>): Promise<TournamentParticipantsPage> => {
if (isFlagPlaceholder || tournamentId === null) {
return {
items: [],
page: 1,
total: 0,
hasMore: false,
limit: 0,
          };
        }

const limit = filters.limit ?? DEFAULT_LIMIT;

const wire = (await getTournamentParticipants(tournamentId, {
page,
...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
        })) as unknown as GetTournamentParticipantsWireResponse;

const items: TournamentParticipant[] = (wire.data ?? []).map(
(item): TournamentParticipant => {
const obj = item as {
userId?: string;
username?: string;
registeredAt?: string;
            };
return {
userId: obj.userId ?? "",
username: obj.username ?? "",
registeredAt: obj.registeredAt ?? "",
id: obj.userId ?? "",
            };
          },
        );

const pagination = wire.meta?.pagination;
return {
items,
page,
total: pagination?.total ?? items.length,
hasMore: pagination?.hasMore ?? false,
limit,
        };
      },
[isFlagPlaceholder, tournamentId, filters],
  );

const result = useCursorPaginated<TournamentParticipant, TournamentParticipantsFilters>({
key,
fetcher,
params: filters,
paginationKind: "offset",
  });

return {
items: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
refresh: result.refresh,
  };
}
