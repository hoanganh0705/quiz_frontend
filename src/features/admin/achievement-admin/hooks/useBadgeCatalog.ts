"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api/core/ApiError";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { listBadges } from "@/features/achievements/services/achievements.service";
import {
  toBadgeSummary,
  type BadgeSummary,
  type BadgeTier,
  type BadgeCategory,
  ACHIEVEMENT_CACHE_KEYS,
} from "@/features/achievements/types";

export interface UseBadgeCatalogOptions {
  readonly tier?: string | null;

  readonly category?: string | null;
}

export interface UseBadgeCatalogResult {
  readonly badges: readonly BadgeSummary[];

  readonly isLoading: boolean;

  readonly error: ApiError | null;
}

export function useBadgeCatalog(
  options: UseBadgeCatalogOptions = {},
): UseBadgeCatalogResult {
  const { tier = null, category = null } = options ?? {};

  const flagValue = getFeatureFlagValue("admin_achievement_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const key = useMemo(
    () =>
      isFlagPlaceholder
        ? (["admin", "achievement", "catalog", "disabled"] as const)
        : ACHIEVEMENT_CACHE_KEYS.catalog({
            tier: (tier ?? undefined) as BadgeTier | undefined,
            category: (category ?? undefined) as
              import("@/features/achievements/types").BadgeCategory | undefined,
          }),
    [isFlagPlaceholder, tier, category],
  );

  const fetcher = useCallback(async (): Promise<BadgeSummary[]> => {
    if (isFlagPlaceholder) return [];
    const wire = await listBadges();
    return (wire ?? []).map(toBadgeSummary);
  }, [isFlagPlaceholder]);

  const { data, error, isLoading } = useQuery<BadgeSummary[], ApiError>(
    {
      queryKey: key,
      queryFn: fetcher,
      enabled: !isFlagPlaceholder,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  return {
    badges: data ?? [],
    isLoading: !isFlagPlaceholder && isLoading && data === undefined,
    error: error ?? null,
  };
}
