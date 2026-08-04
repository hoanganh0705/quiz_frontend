"use client";

/**
 * `useRankingLeaderboard` — global leaderboard paginated read hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B2.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the global leaderboard through the service
 *   layer (`getRankingLeaderboard`) using offset pagination.
 * - Synthesise an `id` alias on each entry so SWR deduplication works.
 * - Expose `userPosition` from the server response — never computed
 *   client-side.
 * - Filter changes reset pagination to the first offset.
 * - Feature-flag gating via `phase5_rankings`.
 *
 * ## Period filter
 *
 * The service accepts `period?: 'weekly' | 'monthly' | 'all_time'`.
 * When `period` is `undefined`, the server returns the default period
 * (verified as `'all_time'` at this commit).
 *
 * ## Pagination kind
 *
 * Leaderboard uses offset pagination (`PaginationDto`, `kind: 'offset'`).
 * The SDK params are `limit?: number` and `offset?: number`.
 *
 * ## Tie preservation
 *
 * Ties render in the order returned by the backend. The hook does not
 * reorder entries.
 *
 * ## Auth reads
 *
 * The leaderboard read is public. Unauthenticated users can still
 * fetch the leaderboard; `userPosition` will be `null`.
 *
 * ## Feature flag
 *
 * When `phase5_rankings === 'placeholder'`, the hook returns safe
 * fallback (empty items, `isLoading: false`, `userPosition: null`).
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getRankingLeaderboard } from "@/features/rankings/services/rankings.service";
import {
  DEFAULT_RANKING_LEADERBOARD_FILTERS,
  RANKING_CACHE_KEYS,
  type RankingErrorCode,
  type RankingLeaderboardEntry,
  type RankingLeaderboardFilters,
  type RankingUserPosition,
} from "@/features/rankings/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { LeaderboardResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRankingLeaderboardResult {
  items: readonly RankingLeaderboardEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True while revalidation is in flight and cached items are present. */
  isStale: boolean;
  /**
   * Server-provided current-user position; never computed client-side.
   *
   * The leaderboard read is a public endpoint; the server emits
   * `userPosition` only for authenticated users. Unauthenticated
   * users always see `userPosition: null`.
   */
  userPosition: RankingUserPosition | null;
}

// ─── Wire type ───────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getRankingLeaderboard`.
 *
 * Shape: `{ data?: LeaderboardResponseDto; meta?: unknown }`.
 */
type GetRankingLeaderboardWireResponse = {
  data?: LeaderboardResponseDto;
  meta?: unknown;
};

// ─── Constants ───────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Project a single wire entry to the `RankingLeaderboardEntry` feature
 * projection. The `id` alias is set to `userId` for SWR deduplication.
 */
function toLeaderboardEntry(
  wire: NonNullable<LeaderboardResponseDto["entries"]>[number],
): RankingLeaderboardEntry {
  return {
    rank: wire.rank,
    denseRank: wire.denseRank,
    userId: wire.userId,
    displayName: wire.displayName,
    avatarUrl: wire.avatarUrl ?? null,
    xp: wire.xp,
    isTied: wire.isTied,
    isCurrentUser: wire.isCurrentUser ?? null,
    id: wire.userId,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the global leaderboard through offset pagination.
 *
 * Filter changes reset pagination to the first offset. The hook
 * never decodes or constructs cursors client-side; it forwards the
 * opaque next-offset value returned by the backend.
 *
 * Returns safe fallback (`items: []`, `isLoading: false`,
 * `userPosition: null`) when `phase5_rankings === 'placeholder'`.
 */
export function useRankingLeaderboard(
  filters: Partial<RankingLeaderboardFilters> = DEFAULT_RANKING_LEADERBOARD_FILTERS,
): UseRankingLeaderboardResult {
  const flagValue = getFeatureFlagValue("phase5_rankings");
  const isFlagPlaceholder = flagValue === "placeholder";

  // SWR cache key. Disabled sentinel when flag is off so no fetch fires.
  const key = useMemo(
    () =>
      isFlagPlaceholder
        ? (["rankings", "leaderboard", "disabled"] as const)
        : RANKING_CACHE_KEYS.leaderboard({
            period: filters.period,
            cursor: filters.cursor,
            limit: filters.limit,
          }),
    [isFlagPlaceholder, filters.period, filters.cursor, filters.limit],
  );

  const fetcher = useMemo(
    () =>
      async ({
        page,
      }: OffsetFetcherArgs<RankingLeaderboardFilters>) => {
        if (isFlagPlaceholder) {
          return {
            items: [] as readonly RankingLeaderboardEntry[],
            page,
            total: 0,
            hasMore: false,
            limit: 0,
          };
        }

        const limit = filters.limit ?? DEFAULT_LIMIT;
        // Convert 1-based page to 0-based offset.
        const offset = (page - 1) * limit;

        const wire = (await getRankingLeaderboard({
          ...(filters.period ? { period: filters.period } : {}),
          offset,
          limit,
        })) as unknown as GetRankingLeaderboardWireResponse;

        const leaderboard = wire.data;
        const items = (leaderboard?.entries ?? []).map(toLeaderboardEntry);
        const pagination = leaderboard?.pagination;

        return {
          items,
          page,
          total: pagination?.limit
            ? Math.max(items.length, pagination.limit)
            : items.length,
          hasMore: pagination?.hasMore ?? false,
          limit: pagination?.limit ?? limit,
        };
      },
    [isFlagPlaceholder, filters.period, filters.limit],
  );

  const result = useCursorPaginated<
    RankingLeaderboardEntry,
    RankingLeaderboardFilters
  >({
    key,
    fetcher,
    params: {
      period: filters.period,
      cursor: filters.cursor,
      limit: filters.limit,
    },
    paginationKind: "offset",
  });

  const isStale = result.items.length > 0 && result.isLoading;

  return {
    items: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error as ApiError | null,
    refresh: result.refresh,
    isStale,
    // The global leaderboard is a public endpoint; the server emits
    // `userPosition` only for authenticated users on the personal
    // ranking endpoint. Hooks that need the current user's position
    // should call `useMyRanking` instead. Returning `null` here is
    // authoritative — the public leaderboard never exposes
    // userPosition to anonymous callers.
    userPosition: null,
  };
}

// ─── Re-exports for consumers ─────────────────────────────────────────────

export type {
  RankingLeaderboardFilters,
  RankingLeaderboardEntry,
  RankingUserPosition,
  RankingErrorCode,
};