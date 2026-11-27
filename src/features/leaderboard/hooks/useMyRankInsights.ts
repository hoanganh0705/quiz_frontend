"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { getLeaderboards } from "@/lib/api/generated/leaderboards/leaderboards";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import type {
  RankMovementResponseDto,
  RankingHistoryItemDto,
  RankingMilestoneDto,
  UserPercentileResponseDto,
} from "@/lib/api/generated/schemas";

export interface NormalizedPercentile {
  readonly rank: number | null;
  readonly totalUsers: number;
  readonly percentile: number | null;
  readonly percentileLabel: string | null;
  readonly betterThanUsers: number | null;
  readonly worseThanUsers: number | null;
}

export interface NormalizedMovement {
  readonly previousRank: number | null;
  readonly currentRank: number | null;
  readonly change: number | null;
  readonly direction: "up" | "down" | "same" | "new";
}

export interface RankingHistoryPoint {
  readonly date: string;
  readonly rank: number;
}

export interface RankingMilestoneItem {
  readonly milestone: string;
  readonly rank: number;
  readonly achievedAt: string;
}

export function useMyPercentile(period: LeaderboardPeriod, enabled = true) {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "me", "percentile", period] as const;
  }, [active, period]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<NormalizedPercentile | null> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetMyPercentile({ period });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as { data?: UserPercentileResponseDto };
        const d = wire.data;
        if (!d) return null;
        return {
          rank: d.rank !== null && d.rank !== undefined ? Number(d.rank) : null,
          totalUsers: Number(d.totalUsers ?? 0),
          percentile:
            d.percentile !== null && d.percentile !== undefined
              ? Number(d.percentile)
              : null,
          percentileLabel:
            typeof d.percentileLabel === "string" ? d.percentileLabel : null,
          betterThanUsers:
            d.betterThanUsers !== null && d.betterThanUsers !== undefined
              ? Number(d.betterThanUsers)
              : null,
          worseThanUsers:
            d.worseThanUsers !== null && d.worseThanUsers !== undefined
              ? Number(d.worseThanUsers)
              : null,
        };
      },
    [period],
  );

  const single = useSingleWithRetry<NormalizedPercentile | null>({
    key,
    fetcher,
  });

  return {
    data: active ? (single.data ?? null) : null,
    isLoading: active ? single.isLoading : false,
    error: active ? (single.error as ApiError | null) : null,
    retry: single.retry,
  };
}

export function useMyRankMovement(period: LeaderboardPeriod, enabled = true) {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "me", "movement", period] as const;
  }, [active, period]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<NormalizedMovement | null> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetMyRankMovement({ period });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as { data?: RankMovementResponseDto };
        const d = wire.data;
        if (!d) return null;
        const dirRaw = String(d.direction ?? "same").toLowerCase();
        const direction: NormalizedMovement["direction"] =
          dirRaw === "up"
            ? "up"
            : dirRaw === "down"
              ? "down"
              : dirRaw === "new"
                ? "new"
                : "same";
        return {
          previousRank:
            d.previousRank !== null && d.previousRank !== undefined
              ? Number(d.previousRank)
              : null,
          currentRank:
            d.currentRank !== null && d.currentRank !== undefined
              ? Number(d.currentRank)
              : null,
          change:
            d.change !== null && d.change !== undefined
              ? Number(d.change)
              : null,
          direction,
        };
      },
    [period],
  );

  const single = useSingleWithRetry<NormalizedMovement | null>({
    key,
    fetcher,
  });

  return {
    data: active ? (single.data ?? null) : null,
    isLoading: active ? single.isLoading : false,
    error: active ? (single.error as ApiError | null) : null,
    retry: single.retry,
  };
}

export function useMyRankingHistory(period: LeaderboardPeriod, enabled = true) {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "me", "history", period] as const;
  }, [active, period]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<readonly RankingHistoryPoint[]> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetMyRankingHistory({
          period,
        });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as {
          data?: RankingHistoryItemDto[] | { items?: RankingHistoryItemDto[] };
        };
        const rawList = Array.isArray(wire.data)
          ? wire.data
          : Array.isArray(wire.data?.items)
            ? wire.data.items
            : [];
        return rawList
          .map((item) => ({
            date: String(item.date),
            rank: Number(item.rank),
          }))
          .filter((item) => !Number.isNaN(item.rank) && item.rank > 0);
      },
    [period],
  );

  const single = useSingleWithRetry<readonly RankingHistoryPoint[]>({
    key,
    fetcher,
  });

  return {
    history: active ? (single.data ?? []) : [],
    isLoading: active ? single.isLoading : false,
    error: active ? (single.error as ApiError | null) : null,
    retry: single.retry,
  };
}

export function useMyRankingMilestones(enabled = true) {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "me", "milestones"] as const;
  }, [active]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<readonly RankingMilestoneItem[]> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetMyRankingMilestones();
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as {
          data?: RankingMilestoneDto[] | { items?: RankingMilestoneDto[] };
        };
        const rawList = Array.isArray(wire.data)
          ? wire.data
          : Array.isArray(wire.data?.items)
            ? wire.data.items
            : [];
        return rawList.map((item) => ({
          milestone: String(item.milestone),
          rank: Number(item.rank),
          achievedAt: String(item.achievedAt ?? ""),
        }));
      },
    [],
  );

  const single = useSingleWithRetry<readonly RankingMilestoneItem[]>({
    key,
    fetcher,
  });

  return {
    milestones: active ? (single.data ?? []) : [],
    isLoading: active ? single.isLoading : false,
    error: active ? (single.error as ApiError | null) : null,
    retry: single.retry,
  };
}
