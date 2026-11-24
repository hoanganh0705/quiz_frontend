"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getUserRanking } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toUserRanking,
  type RankingErrorCode,
  type UserRanking,
} from "@/features/rankings/types";

import type { UserRankResponseDto } from "@/lib/api/generated/schemas";

export interface UseUserRankingResult {
  ranking: UserRanking | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;

  isStale: boolean;

  isPrivate: boolean;
}

export function useUserRanking(userId: string | null): UseUserRankingResult {
  const key = useMemo(
    () =>
      userId === null
        ? null
        : RANKING_CACHE_KEYS.user(userId),
    [userId],
  );

  const fetcher = useCallback(async () => {
    if (userId === null) {
      return null;
    }
    const wire = (await getUserRanking(userId)) as UserRankResponseDto | null;
    return toUserRanking(wire, userId);
  }, [userId]);

  const result = useSingleWithRetry<UserRanking | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  const errorCode = String(result.error?.code ?? "");
  const isPrivate =
    errorCode === "RANKING_FORBIDDEN" || errorCode === "RANKING_NOT_FOUND";

  if (userId === null) {
    return {
      ranking: null,
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
      isPrivate: false,
    };
  }

  return {
    ranking: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
    isPrivate,
  };
}

export type { UserRanking, RankingErrorCode };
