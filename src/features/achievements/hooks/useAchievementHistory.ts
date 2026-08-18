"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getMyAchievementHistory } from "@/features/achievements/services/achievements.service";
import {
DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
ACHIEVEMENT_CACHE_KEYS,
toAchievementHistoryEntry,
type AchievementErrorCode,
type AchievementHistoryEntry,
type AchievementHistoryFilters,
} from "@/features/achievements/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
AchievementHistoryItemResponseDto,
OffsetPaginationMetaDto,
} from "@/lib/api/generated/schemas";

export interface UseAchievementHistoryResult {
items: readonly AchievementHistoryEntry[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
refresh: () => Promise<void>;

isStale: boolean;
}

type GetMyAchievementHistoryWireResponse = {
data?: AchievementHistoryItemResponseDto[];
meta?: { pagination?: OffsetPaginationMetaDto };
};

const DEFAULT_LIMIT = 20;

export function useAchievementHistory(
filters: Partial<AchievementHistoryFilters> = DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
): UseAchievementHistoryResult {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { bootstrapState } = useAuthSession();
const isAuthenticated = bootstrapState === "authenticated";

const key = useMemo(
() =>
isFlagPlaceholder || !isAuthenticated
? (["achievements", "me", "history", "disabled"] as const)
: ACHIEVEMENT_CACHE_KEYS.history({
page: filters.page,
limit: filters.limit,
category: filters.category,
          }),
[
isFlagPlaceholder,
isAuthenticated,
filters.page,
filters.limit,
filters.category,
    ],
  );

const fetcher = useMemo(
() =>
async ({
page,
      }: OffsetFetcherArgs<AchievementHistoryFilters>) => {
if (isFlagPlaceholder || !isAuthenticated) {
return {
items: [] as readonly AchievementHistoryEntry[],
page,
total: 0,
hasMore: false,
limit: 0,
          };
        }

const limit = filters.limit ?? DEFAULT_LIMIT;

const offset = (page - 1) * limit;

const wire = (await getMyAchievementHistory({
offset,
limit,
        })) as unknown as GetMyAchievementHistoryWireResponse;

const entries = (wire.data ?? []).map(toAchievementHistoryEntry);
const pagination = wire.meta?.pagination;
return {
items: entries,
page: pagination?.page ?? page,
total: pagination?.total ?? entries.length,
hasMore: pagination?.hasMore ?? false,
limit: pagination?.limit ?? limit,
        };
      },
[isFlagPlaceholder, isAuthenticated, filters.limit],
  );

const result = useCursorPaginated<
AchievementHistoryEntry,
AchievementHistoryFilters
  >({
key,
fetcher,
params: {
page: filters.page,
limit: filters.limit,
category: filters.category,
    },
paginationKind: "offset",
  });

const isStale = result.items.length > 0 && result.isLoading;

if (isFlagPlaceholder || !isAuthenticated) {
return {
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: () => {
        /* no-op */
      },
error: null,
refresh: async () => {
        /* no-op */
      },
isStale: false,
    };
  }

return {
items: result.items,
isLoading: result.isLoading,
isLoadingMore: result.isLoadingMore,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error as ApiError | null,
refresh: result.refresh,
isStale,
  };
}

export type {
AchievementHistoryEntry,
AchievementHistoryFilters,
AchievementErrorCode,
};