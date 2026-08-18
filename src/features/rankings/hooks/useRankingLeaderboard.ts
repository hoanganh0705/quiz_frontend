"use client";

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

export interface UseRankingLeaderboardResult {
items: readonly RankingLeaderboardEntry[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;

isStale: boolean;

userPosition: RankingUserPosition | null;
}

type GetRankingLeaderboardWireResponse = {
data?: LeaderboardResponseDto;
meta?: unknown;
};

const DEFAULT_LIMIT = 20;

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

export function useRankingLeaderboard(
filters: Partial<RankingLeaderboardFilters> = DEFAULT_RANKING_LEADERBOARD_FILTERS,
): UseRankingLeaderboardResult {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

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

userPosition: null,
  };
}

export type {
RankingLeaderboardFilters,
RankingLeaderboardEntry,
RankingUserPosition,
RankingErrorCode,
};