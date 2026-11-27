"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { getLeaderboards } from "@/lib/api/generated/leaderboards/leaderboards";

import type { RankingHistoryPoint } from "./useMyRankInsights";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import type {
  PublicRankingHistoryResponseDto,
  UserRankResponseDto,
} from "@/lib/api/generated/schemas";

export interface SelectedPlayerPreview {
  readonly userId: string;
  readonly displayName: string;
  readonly username?: string | null;
  readonly avatarUrl?: string | null;
  readonly rank?: number | null;
  readonly xp?: number | null;
  readonly isCurrentUser?: boolean;
}

export interface PlayerDossierData {
  readonly profileRank: UserRankResponseDto | null;
  readonly history: readonly RankingHistoryPoint[];
  readonly resolvedUsername: string | null;
}

export interface UsePlayerDossierResult {
  readonly profileRank: UserRankResponseDto | null;
  readonly history: readonly RankingHistoryPoint[];
  readonly resolvedUsername: string | null;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly retry: () => Promise<void>;
}

export function usePlayerDossier(
  player: SelectedPlayerPreview | null,
  period: LeaderboardPeriod,
): UsePlayerDossierResult {
  const userId = player?.userId ?? null;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!userId) return null;
    return ["leaderboard", "dossier", userId, period] as const;
  }, [period, userId]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<PlayerDossierData> => {
        if (!userId) {
          return { profileRank: null, history: [], resolvedUsername: null };
        }
        const sdk = getLeaderboards();
        const [rankOutcome, historyOutcome] = await Promise.allSettled([
          sdk.rankingControllerGetUserRank(userId),
          sdk.rankingControllerGetUserRankingHistory(userId, { period }),
        ]);

        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }

        let profileRank: UserRankResponseDto | null = null;
        if (rankOutcome.status === "fulfilled") {
          const wire = rankOutcome.value as unknown as {
            data?: UserRankResponseDto;
          };
          profileRank = wire?.data ?? null;
        }

        let history: readonly RankingHistoryPoint[] = [];
        let resolvedUsername: string | null = null;
        if (historyOutcome.status === "fulfilled") {
          const wire = historyOutcome.value as unknown as {
            data?: PublicRankingHistoryResponseDto;
          };
          const payload = wire?.data;
          if (typeof payload?.username === "string") {
            resolvedUsername = payload.username;
          }
          if (Array.isArray(payload?.history)) {
            history = payload.history
              .map((item) => ({
                date: String(item.date),
                rank: Number(item.rank),
              }))
              .filter((item) => !Number.isNaN(item.rank) && item.rank > 0);
          }
        }

        return { profileRank, history, resolvedUsername };
      },
    [period, userId],
  );

  const single = useSingleWithRetry<PlayerDossierData>({
    key,
    fetcher,
  });

  if (!userId) {
    return {
      profileRank: null,
      history: [],
      resolvedUsername: null,
      isLoading: false,
      error: null,
      retry: () => Promise.resolve(),
    };
  }

  return {
    profileRank: single.data?.profileRank ?? null,
    history: single.data?.history ?? [],
    resolvedUsername: single.data?.resolvedUsername ?? null,
    isLoading: single.isLoading,
    error: single.error,
    retry: single.retry,
  };
}
