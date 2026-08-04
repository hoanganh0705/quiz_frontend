"use client";

/**
 * `useTournaments` — cursor-paginated tournament list hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.B1.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the tournament list through the service layer
 *   using opaque cursor pagination and the status filter.
 * - Synthesise an `id` alias on each tournament so
 *   `appendUniqueById` deduplication in `useCursorPaginated` works.
 * - Expose `isStale` when revalidation fails with cached data present.
 * - Feature-flag gating via `phase5_tournaments`.
 *
 * ## Status filter
 *
 * The service accepts `status?: 'upcoming' | 'active' | 'completed'`.
 * When `status` is `undefined`, all statuses are returned.
 *
 * ## Cursor hygiene
 *
 * Cursors are opaque. The hook never decodes or constructs cursors.
 *
 * ## Auth reads
 *
 * Public tournament list reads do not redirect unauthenticated users.
 * The hook fetches regardless of auth state (no auth-gating needed).
 */

import { useMemo } from "react";

import {
  ApiError,
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

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseTournamentsResult {
  items: readonly TournamentSummary[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True when revalidation failed with cached data present. */
  isStale: boolean;
}

// ─── Wire type ────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `listTournaments` (post-unwrap).
 *
 * Mirrors the generated `TournamentControllerListTournaments200AllOf` shape:
 * `{ data?: TournamentResponseDto[]; meta?: { pagination?: PaginationMetaDto } }`.
 */
type ListTournamentsWireResponse = TournamentControllerListTournaments200AllOf;

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTournaments(
  filters: TournamentListFilters = DEFAULT_TOURNAMENT_LIST_FILTERS,
): UseTournamentsResult {
  const flagValue = getFeatureFlagValue("phase5_tournaments");
  const isFlagPlaceholder = flagValue === "placeholder";

  // SWR cache key: disabled sentinel when flag is off so no fetch fires.
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
        // Feature flag off: short-circuit to an empty page.
        if (isFlagPlaceholder) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? filters.cursor ?? undefined;

        // TODO: Verify the deployed listTournaments params when backend
        // confirms status and search support. Using cursor-only for now.
        const wire = (await listTournaments({
          ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
          ...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
        })) as unknown as ListTournamentsWireResponse;

        const items: TournamentSummary[] = (wire.data ?? []).map(
          (item): TournamentSummary =>
            Object.assign({}, item, { id: item.tournamentId }),
        );

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

// Re-export for consumers
export type { TournamentListPage };
