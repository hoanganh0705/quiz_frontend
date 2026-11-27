"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { getLeaderboards } from "@/lib/api/generated/leaderboards/leaderboards";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export interface NearbyRankEntry {
  readonly rank: number;
  readonly userId: string;
  readonly username: string;
  readonly xp: number;
}

export interface NearbyRanksData {
  readonly above: readonly NearbyRankEntry[];
  readonly me: NearbyRankEntry | null;
  readonly below: readonly NearbyRankEntry[];
}

export interface UseNearbyRanksResult extends NearbyRanksData {
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly retry: () => Promise<void>;
}

function normalizeNearbyEntry(raw: unknown): NearbyRankEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.userId !== "string") return null;
  return {
    rank: Number(item.rank ?? 0),
    userId: item.userId,
    username: typeof item.username === "string" ? item.username : "Player",
    xp: Number(item.xp ?? 0),
  };
}

export function useNearbyRanks(
  period: LeaderboardPeriod,
  radius = 2,
  enabled = true,
): UseNearbyRanksResult {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "me", "nearby", period, radius] as const;
  }, [active, period, radius]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<NearbyRanksData> => {
        const sdk = getLeaderboards();
        const result = await sdk.rankingControllerGetNearbyRanks({
          period,
          radius,
        });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as {
          data?: {
            above?: unknown[];
            me?: unknown;
            below?: unknown[];
          };
        };
        const data = wire.data;
        const above = Array.isArray(data?.above)
          ? data.above
              .map(normalizeNearbyEntry)
              .filter((entry): entry is NearbyRankEntry => entry !== null)
          : [];
        const below = Array.isArray(data?.below)
          ? data.below
              .map(normalizeNearbyEntry)
              .filter((entry): entry is NearbyRankEntry => entry !== null)
          : [];
        const me = normalizeNearbyEntry(data?.me);

        return { above, me, below };
      },
    [period, radius],
  );

  const single = useSingleWithRetry<NearbyRanksData>({
    key,
    fetcher,
  });

  if (!active) {
    return {
      above: [],
      me: null,
      below: [],
      isLoading: false,
      error: null,
      retry: () => Promise.resolve(),
    };
  }

  return {
    above: single.data?.above ?? [],
    me: single.data?.me ?? null,
    below: single.data?.below ?? [],
    isLoading: single.isLoading,
    error: single.error,
    retry: single.retry,
  };
}
