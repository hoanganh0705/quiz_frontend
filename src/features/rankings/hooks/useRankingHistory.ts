"use client";

import { useCallback, useMemo, useRef } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRankingHistory } from "@/features/rankings/services/rankings.service";
import {
RANKING_CACHE_KEYS,
toRankingHistoryEntry,
type RankingErrorCode,
type RankingHistoryEntry,
type RankingHistoryFilters,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { RankingHistoryItemDto } from "@/lib/api/generated/schemas";

export interface UseRankingHistoryResult {
items: readonly RankingHistoryEntry[];
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;

isStale: boolean;
}

export function useRankingHistory(
_filters: RankingHistoryFilters = {},
): UseRankingHistoryResult {
const flagValue = getFeatureFlagValue("rankings_live");
const isFlagPlaceholder = flagValue === "placeholder";

const { bootstrapState } = useAuthSession();
const isAuthenticated = bootstrapState === "authenticated";

const key = useMemo(
() =>
isFlagPlaceholder || !isAuthenticated
? null
: RANKING_CACHE_KEYS.myHistory(_filters),
[isFlagPlaceholder, isAuthenticated, _filters],
  );

const lastValidatedAtRef = useRef<string | null>(null);

const fetcher = useCallback(
async () => {
if (isFlagPlaceholder || !isAuthenticated) {
return [] as RankingHistoryEntry[];
      }
const wire = (await getMyRankingHistory()) as
| RankingHistoryItemDto[]
        | null
        | undefined;
const items = (wire ?? []).map(toRankingHistoryEntry);
if (items.length > 0 || wire) {
lastValidatedAtRef.current = new Date().toISOString();
      }
return items;
    },
[isFlagPlaceholder, isAuthenticated],
  );

const result = useSingleWithRetry<RankingHistoryEntry[]>({
key,
fetcher,
  });

const isStale = result.data !== undefined && result.isRetrying;

if (isFlagPlaceholder || !isAuthenticated) {
return {
items: [],
isLoading: false,
error: null,
retry: async () => {
        /* no-op */
      },
isStale: false,
    };
  }

return {
items: result.data ?? [],
isLoading: result.isLoading,
error: result.error as ApiError | null,
retry: result.retry,
isStale,
  };
}

export type { RankingHistoryEntry, RankingHistoryFilters, RankingErrorCode };