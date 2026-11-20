"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import {
  getDailyChallengeCategoryBreakdown,
  type DailyChallengeCategoryBreakdownItemView,
} from "@/features/daily-challenge/services/daily-challenge.service";

/**
 * `useDailyChallengeCategoryBreakdown` — surfaces the viewer's
 * per-category rollup of completed daily-challenge attempts.
 *
 * ## Output shape
 *
 * The hook exposes a `readonly` array of
 * `DailyChallengeCategoryBreakdownItemView`:
 *
 * ```ts
 * Array<{
 *   categoryId: string
 *   categoryName: string
 *   categorySlug: string
 *   attemptCount: number
 *   averageScorePercent: number  // 0–100, 2dp
 * }>
 * ```
 *
 * The array is sorted by `attemptCount DESC, averageScorePercent
 * DESC` server-side — i.e. the largest contributor is first. Empty
 * arrays are returned when the viewer has no completed attempts in
 * any category (which `<ChallengePieChart />` renders as an explicit
 * "Take today's challenge to start your breakdown" state).
 *
 * ## Loading / error semantics
 *
 * Keys the payload under `['daily-challenge', 'history', 'categories']` and
 * surfaces a typed `ApiError | null`. The chart renders a skeleton
 * while `isLoading`, an explicit retry surface when `error` is
 * non-null, and the chart itself when `items.length > 0`.
 */
export type DailyChallengeCategoryBreakdownItemWithMeta =
  DailyChallengeCategoryBreakdownItemView & { id: string };

export interface UseDailyChallengeCategoryBreakdownResult {
  items: readonly DailyChallengeCategoryBreakdownItemWithMeta[];
  isLoading: boolean;
  error: ApiError | null;
  /**
   * Re-fetch the underlying breakdown. Exposed so the chart's error
   * state can offer a retry affordance without the chart reaching
   * into the query key directly.
   */
  refresh: () => Promise<void>;
}

const QUERY_KEY = ["daily-challenge", "history", "categories"] as const;

export function useDailyChallengeCategoryBreakdown(): UseDailyChallengeCategoryBreakdownResult {
  const queryClient = getQueryClient();
  const { data, error, isLoading, refetch } = useQuery(
    {
      queryKey: QUERY_KEY,
      queryFn: async (): Promise<
        readonly DailyChallengeCategoryBreakdownItemWithMeta[]
      > => {
        const result = await getDailyChallengeCategoryBreakdown();
        if (result.kind === "missing-endpoint") {
          // Treat the endpoint as not-yet-shipped the same way the
          // history hook does — throw so Query marks the response as
          // an error and the chart renders an honest retry surface.
          throw new Error(
            "daily-challenge history/categories endpoint unavailable",
          );
        }
        if (result.kind === "error") {
          throw result.error;
        }
        return result.data.items.map((item) => ({
          ...item,
          id: item.categoryId,
        }));
      },
      retry: 3,
    },
    queryClient,
  );

  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  return {
    items: data ?? EMPTY_ITEMS,
    isLoading,
    error: error instanceof ApiError ? error : null,
    refresh,
  };
}

const EMPTY_ITEMS: readonly DailyChallengeCategoryBreakdownItemWithMeta[] =
  Object.freeze([]);
