"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api/core/ApiError";

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
  const key = useMemo(
    () =>
      ACHIEVEMENT_CACHE_KEYS.catalog({
            tier: (tier ?? undefined) as BadgeTier | undefined,
            category: (category ?? undefined) as
              import("@/features/achievements/types").BadgeCategory | undefined,
          }),
    [tier, category],
  );

  const fetcher = useCallback(async (): Promise<BadgeSummary[]> => {
    if (false) return [];
    const wire = await listBadges();
    return (wire ?? []).map(toBadgeSummary);
  }, []);

  const { data, error, isLoading } = useQuery<BadgeSummary[], ApiError>(
    {
      queryKey: key,
      queryFn: fetcher,
      enabled: !false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  return {
    badges: data ?? [],
    isLoading: isLoading && data === undefined,
    error: error ?? null,
  };
}
