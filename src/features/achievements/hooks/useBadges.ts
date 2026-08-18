"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { listBadges } from "@/features/achievements/services/achievements.service";
import {
DEFAULT_BADGE_CATALOG_FILTERS,
ACHIEVEMENT_CACHE_KEYS,
toBadgeSummary,
type AchievementErrorCode,
type BadgeCatalogFilters,
type BadgeSummary,
} from "@/features/achievements/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { BadgeCatalogItemResponseDto } from "@/lib/api/generated/schemas";
import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

export interface UseBadgesResult {
badges: readonly BadgeSummary[];
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;

isStale: boolean;
}

export function useBadges(
filters: BadgeCatalogFilters = DEFAULT_BADGE_CATALOG_FILTERS,
): UseBadgesResult {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder
? (["achievements", "catalog", "disabled"] as const)
: ACHIEVEMENT_CACHE_KEYS.catalog(filters),
[isFlagPlaceholder, filters],
  );

const fetcher = useCallback(
async () => {
if (isFlagPlaceholder) {
return [] as BadgeSummary[];
      }

const wire =
((await listBadges()) as unknown as Array<
BadgeCatalogItemResponseDto | NormalizedBadge
        >) ?? [];
return wire.map(toBadgeSummary);
    },
[isFlagPlaceholder],
  );

const result = useSingleWithRetry<BadgeSummary[]>({
key,
fetcher,
  });

const isStale = result.data !== undefined && result.isRetrying;

if (isFlagPlaceholder) {
return {
badges: [],
isLoading: false,
error: null,
retry: async () => {
        /* no-op */
      },
isStale: false,
    };
  }

return {
badges: result.data ?? [],
isLoading: result.isLoading,
error: result.error as ApiError | null,
retry: result.retry,
isStale,
  };
}

export type { BadgeSummary, BadgeCatalogFilters, AchievementErrorCode };