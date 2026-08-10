"use client";

/**
 * `useTournamentLeaderboard` — offset-paginated tournament leaderboard hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.B4.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the tournament leaderboard through the service layer
 *   using offset pagination.
 * - Synthesise an `id` alias on each entry for deduplication.
 * - Expose `isStale` when revalidation fails with cached data present
 *   (leaderboard is eventually consistent).
 * - Feature-flag gating via `tournaments_live`.
 *
 * ## Pagination kind
 *
 * Leaderboard uses offset pagination (`OffsetPaginationMetaDto`, `kind: 'offset'`).
 *
 * ## Auth reads
 *
 * Public leaderboard reads do not require authentication.
 *
 * ## Server authority
 *
 * A completed tournament with no entries renders the empty state —
 * no client-side fallback or synthetic leaderboard is constructed.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getTournamentLeaderboard } from "@/features/tournaments/services/tournaments.service";
import {
  TOURNAMENT_CACHE_KEYS,
  type TournamentLeaderboardFilters,
  type TournamentLeaderboardPage,
  type TournamentLeaderboardEntry,
} from "@/features/tournaments/types/tournament.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseTournamentLeaderboardResult {
  items: readonly TournamentLeaderboardEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True when revalidation failed with cached data present (leaderboard is eventually consistent). */
  isStale: boolean;
}

// ─── Wire type ─────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getTournamentLeaderboard`.
 *
 * The SDK returns `TournamentControllerGetLeaderboard200` which is
 * `WrappedPaginatedDto & TournamentControllerGetLeaderboard200AllOf`.
 * Shape: `{ data: WrappedPaginatedDtoDataItem[]; meta: PaginatedResponseMetaDto }`.
 */
type GetTournamentLeaderboardWireResponse = {
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

// ─── Constants ─────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTournamentLeaderboard(
  tournamentId: string | null,
  filters: TournamentLeaderboardFilters = {},
): UseTournamentLeaderboardResult {
  const flagValue = getFeatureFlagValue("tournaments_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // SWR cache key.
  const key = useMemo(
    () =>
      isFlagPlaceholder || tournamentId === null
        ? (["tournaments", "leaderboard", "disabled"] as const)
        : TOURNAMENT_CACHE_KEYS.leaderboard(tournamentId, filters),
    [isFlagPlaceholder, tournamentId, filters],
  );

  const fetcher = useMemo(
    () =>
      async ({
        page,
      }: OffsetFetcherArgs<TournamentLeaderboardFilters>): Promise<TournamentLeaderboardPage> => {
        if (isFlagPlaceholder || tournamentId === null) {
          return {
            items: [],
            page: 1,
            total: 0,
            hasMore: false,
            limit: 0,
          };
        }

        // Convert 1-based page to 0-based offset.
        const limit = filters.limit ?? DEFAULT_LIMIT;
        const offset = (page - 1) * limit;

        const wire = (await getTournamentLeaderboard(tournamentId, {
          offset,
          ...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
        })) as unknown as GetTournamentLeaderboardWireResponse;

        const items: TournamentLeaderboardEntry[] = (wire.data ?? []).map(
          (item): TournamentLeaderboardEntry => {
            const obj = item as {
              rank?: number;
              participantId?: string;
              userId?: string;
              username?: string;
              avatarUrl?: string | null;
              totalScore?: number;
            };
            return {
              rank: obj.rank ?? 0,
              participantId: obj.participantId ?? "",
              userId: obj.userId ?? "",
              username: obj.username ?? "",
              avatarUrl: obj.avatarUrl ?? undefined,
              totalScore: obj.totalScore ?? 0,
              totalTimeMs: 0,
              rankFinal: undefined,
              status: "active" as const,
              id: obj.participantId ?? "",
              score: obj.totalScore ?? 0,
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

  const result = useCursorPaginated<TournamentLeaderboardEntry, TournamentLeaderboardFilters>({
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
    isStale: false, // TODO: wire stale-data tracking when Epic 5.1 SWR stale hook lands
  };
}
