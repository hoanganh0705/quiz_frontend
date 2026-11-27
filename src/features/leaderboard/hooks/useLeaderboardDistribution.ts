"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { getLeaderboards } from "@/lib/api/generated/leaderboards/leaderboards";

import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import type { LeaderboardDistributionResponseDto } from "@/lib/api/generated/schemas";

export interface DistributionBucket {
  readonly label: string;
  readonly count: number;
}

export interface UseLeaderboardDistributionResult {
  readonly totalUsers: number;
  readonly remainingUsers: number;
  readonly buckets: readonly DistributionBucket[];
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly retry: () => Promise<void>;
}

interface NormalizedDistribution {
  readonly totalUsers: number;
  readonly remainingUsers: number;
  readonly buckets: readonly DistributionBucket[];
}

export function useLeaderboardDistribution(
  period: LeaderboardPeriod,
  enabled = true,
): UseLeaderboardDistributionResult {
  const key = useMemo<readonly unknown[] | null>(() => {
    if (!enabled) return null;
    return ["leaderboard", "distribution", period] as const;
  }, [enabled, period]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<NormalizedDistribution> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetLeaderboardDistribution({
          period,
        });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as {
          data?: LeaderboardDistributionResponseDto;
        };
        const payload = wire.data;
        if (!payload) {
          return { totalUsers: 0, remainingUsers: 0, buckets: [] };
        }
        const buckets = Array.isArray(payload.buckets)
          ? payload.buckets.map((bucket) => ({
              label: String(bucket.label),
              count: Number(bucket.count ?? 0),
            }))
          : [];
        return {
          totalUsers: Number(payload.totalUsers ?? 0),
          remainingUsers: Number(payload.remainingUsers ?? 0),
          buckets,
        };
      },
    [period],
  );

  const single = useSingleWithRetry<NormalizedDistribution>({
    key,
    fetcher,
  });

  return {
    totalUsers: single.data?.totalUsers ?? 0,
    remainingUsers: single.data?.remainingUsers ?? 0,
    buckets: single.data?.buckets ?? [],
    isLoading: enabled ? single.isLoading : false,
    error: enabled ? single.error : null,
    retry: single.retry,
  };
}
