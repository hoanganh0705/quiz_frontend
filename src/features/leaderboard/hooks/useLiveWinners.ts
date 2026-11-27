"use client";

import { useCallback, useMemo } from "react";

import { getLeaderboards, useSingleWithRetry } from "@/lib/api";

import type { SingleFetcher } from "@/lib/api";

export interface WinnerSummary {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly quizTitle: string;
  readonly amountWon: string;
  readonly timeAgo: string;
  readonly wonAt: string;
}

interface RecentWinnersResponse {
  readonly winners: readonly WinnerSummary[];
  readonly lastUpdated: string;
}

export interface UseLiveWinnersResult {
  readonly winners: readonly WinnerSummary[];
  readonly lastUpdated: string | null;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly refresh: () => Promise<void>;
  readonly isRetrying: boolean;
}

const QUERY_KEY = ["leaderboard", "recent-winners"] as const;

export function useLiveWinners(enabled = true): UseLiveWinnersResult {
  const key = useMemo<readonly unknown[] | null>(
    () => (enabled ? QUERY_KEY : null),
    [enabled],
  );

  const fetcher = useMemo<SingleFetcher<RecentWinnersResponse | null>>(
    () => async () => {
      try {
        const envelope =
          await getLeaderboards().rankingControllerGetRecentWinners();
        const payload = envelope?.data ?? null;
        return payload as RecentWinnersResponse | null;
      } catch {
        return null;
      }
    },
    [],
  );

  const { data, isLoading, error, retry, isRetrying } =
    useSingleWithRetry<RecentWinnersResponse | null>({
      key,
      fetcher,
    });

  const refresh = useCallback(async (): Promise<void> => {
    await retry();
  }, [retry]);

  return {
    winners: enabled ? (data?.winners ?? []) : [],
    lastUpdated: enabled ? (data?.lastUpdated ?? null) : null,
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : null,
    refresh,
    isRetrying: enabled ? isRetrying : false,
  };
}
