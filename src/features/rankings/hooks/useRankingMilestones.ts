"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRankingMilestones } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toRankingMilestone,
  type RankingErrorCode,
  type RankingMilestone,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import type { RankingMilestoneDto } from "@/lib/api/generated/schemas";

export interface UseRankingMilestonesResult {
  milestones: readonly RankingMilestone[];
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;

  isStale: boolean;
}

export function useRankingMilestones(): UseRankingMilestonesResult {
  const { bootstrapState } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";

  const key = useMemo(
    () =>
      !isAuthenticated
        ? null
        : RANKING_CACHE_KEYS.myMilestones(),
    [isAuthenticated],
  );

  const fetcher = useCallback(async () => {
    if (!isAuthenticated) {
      return [] as RankingMilestone[];
    }
    const wire = (await getMyRankingMilestones()) as
      RankingMilestoneDto[] | null | undefined;
    return (wire ?? []).map(toRankingMilestone);
  }, [isAuthenticated]);

  const result = useSingleWithRetry<RankingMilestone[]>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  if (!isAuthenticated) {
    return {
      milestones: [],
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
    };
  }

  return {
    milestones: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
  };
}

export type { RankingMilestone, RankingErrorCode };
