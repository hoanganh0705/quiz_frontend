"use client";

import { useMemo, useState } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import {
  getLeaderboardWithPagination,
  type LeaderboardPeriod,
} from "@/features/leaderboard/services/leaderboard.service";

import type { LeaderboardEntryDto } from "@/lib/api/generated/schemas";
import type { OffsetPage } from "@/lib/api/use-cursor-paginated.types";

export const LEADERBOARD_PAGE_LIMIT = 20;

export type LeaderboardEntryWithId = LeaderboardEntryDto & { id: string };

export interface UseLeaderboardResult {
  entries: readonly LeaderboardEntryWithId[];
  totalParticipants?: number | null;
  resetInSeconds?: number | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  retryBannerVisible: boolean;
}

interface PeriodMetaMap {
  [period: string]: {
    totalParticipants: number | null;
    resetInSeconds: number | null;
  };
}

export interface UseLeaderboardOptions {
  enabled?: boolean;
}

export function useLeaderboard(
  period: LeaderboardPeriod,
  options?: UseLeaderboardOptions,
): UseLeaderboardResult {
  const enabled = options?.enabled ?? true;
  const [metaByPeriod, setMetaByPeriod] = useState<PeriodMetaMap>({});

  const fetcher = useMemo(
    () =>
      async ({
        page,
        params,
      }: {
        page: number;
        params: { period: LeaderboardPeriod; limit: number };
        signal?: AbortSignal;
      }): Promise<OffsetPage<LeaderboardEntryWithId>> => {
        const offset = (page - 1) * params.limit;
        const result = await getLeaderboardWithPagination(params.period, {
          limit: params.limit,
          offset,
        });

        const data = (
          result as {
            data?: {
              entries?: LeaderboardEntryDto[];
              totalParticipants?: number | null;
              period?: { resetInSeconds?: number | null } | null;
              pagination?: { hasMore?: boolean; limit?: number };
            };
          }
        ).data;

        if (page === 1 && data) {
          const nextParticipants =
            typeof data.totalParticipants === "number"
              ? data.totalParticipants
              : null;
          const nextReset =
            typeof data.period?.resetInSeconds === "number"
              ? data.period.resetInSeconds
              : null;
          setMetaByPeriod((prev) => {
            const existing = prev[params.period];
            if (
              existing &&
              existing.totalParticipants === nextParticipants &&
              existing.resetInSeconds === nextReset
            ) {
              return prev;
            }
            return {
              ...prev,
              [params.period]: {
                totalParticipants: nextParticipants,
                resetInSeconds: nextReset,
              },
            };
          });
        }

        const rawEntries = (data?.entries ?? []) as Array<LeaderboardEntryWithId>;
        const entries = rawEntries.map((entry) => ({
          ...entry,
          rank: Number(entry.rank),
          denseRank: Number(entry.denseRank),
          xp: Number(entry.xp),
        }));

        const itemsWithId = projectWithId(
          entries as unknown as readonly Record<string, unknown>[],
          "userId",
        ) as unknown as Array<LeaderboardEntryWithId>;

        const pagination = (
          result as {
            data?: { pagination?: { hasMore?: boolean; limit?: number } };
          }
        ).data?.pagination;
        return {
          items: itemsWithId,
          page,
          total: itemsWithId.length,
          hasMore: pagination?.hasMore ?? false,
          limit: pagination?.limit ?? itemsWithId.length,
        };
      },
    [],
  );

  const result = useCursorPaginated<
    LeaderboardEntryWithId,
    { period: LeaderboardPeriod; limit: number }
  >({
    key: ["leaderboard", period, { limit: LEADERBOARD_PAGE_LIMIT }],
    fetcher,
    params: { period, limit: LEADERBOARD_PAGE_LIMIT },
    paginationKind: "offset",
    enabled,
  });

  const activeMeta = metaByPeriod[period];

  return {
    entries: result.items,
    totalParticipants: activeMeta?.totalParticipants ?? null,
    resetInSeconds: activeMeta?.resetInSeconds ?? null,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error,
    refresh: result.refresh,
    retryBannerVisible: result.retryBannerVisible ?? false,
  };
}
