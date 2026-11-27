"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import { listTournaments } from "@/features/tournaments/services/tournaments.service";
import {
  DEFAULT_TOURNAMENT_LIST_FILTERS,
  TOURNAMENT_CACHE_KEYS,
} from "@/features/tournaments/types/tournament.types";

import type { TournamentControllerListTournaments200AllOf } from "@/lib/api/generated/schemas";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";
import type {
  TournamentListFilters,
  TournamentListPage,
  TournamentSummary,
} from "@/features/tournaments/types/tournament.types";

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
  const key = useMemo(() => TOURNAMENT_CACHE_KEYS.list(filters), [filters]);

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<TournamentListFilters>): Promise<TournamentListPage> => {
        const effectiveCursor = cursor ?? filters.cursor ?? undefined;

        const wire = (await listTournaments({
          ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
          ...(typeof filters.limit === "number"
            ? { limit: filters.limit }
            : {}),
          ...(filters.status ? { status: filters.status } : {}),
        })) as ListTournamentsWireResponse;

        const rawItems: TournamentSummary[] = projectWithId(
          wire.data ?? [],
          "tournamentId",
        );

        const normalizedSearch = filters.search.trim().toLowerCase();
        const items =
          normalizedSearch.length > 0
            ? rawItems.filter((item) => {
                const title = String(item.title ?? "").toLowerCase();
                const description = String(
                  item.description ?? "",
                ).toLowerCase();
                return (
                  title.includes(normalizedSearch) ||
                  description.includes(normalizedSearch)
                );
              })
            : rawItems;

        const pagination = wire.meta?.pagination;
        const limit = pagination?.limit ?? items.length;
        return {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit,
        };
      },
    [filters],
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
    isStale: false,
  };
}

export type { TournamentListPage };
