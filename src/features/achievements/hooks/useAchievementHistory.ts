"use client";

/**
 * `useAchievementHistory` — authenticated user's achievement history hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B7.
 *
 * ## What this hook owns
 *
 * - Fetch and paginate the authenticated user's achievement history
 *   through the service layer (`getMyAchievementHistory`) using
 *   offset pagination.
 * - Project each wire entry to the `AchievementHistoryEntry` feature
 *   type with an `id` alias so SWR deduplication works.
 * - Map service errors to the typed `AchievementErrorCode` union.
 * - Category filter changes reset pagination to the first page.
 * - Feature-flag gating via `phase5_achievements`.
 *
 * ## Pagination kind
 *
 * History uses offset pagination (`OffsetPaginationMetaDto`,
 * `kind: 'offset'`). The SDK params are `limit?: number` and
 * `offset?: number`.
 *
 * ## Auth requirement
 *
 * Achievement history is a private read — the hook short-circuits to
 * safe fallback when the user is unauthenticated.
 *
 * ## Feature flag
 *
 * When `phase5_achievements === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getMyAchievementHistory } from "@/features/achievements/services/achievements.service";
import {
  DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
  ACHIEVEMENT_CACHE_KEYS,
  toAchievementHistoryEntry,
  type AchievementErrorCode,
  type AchievementHistoryEntry,
  type AchievementHistoryFilters,
} from "@/features/achievements/types";
import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  AchievementHistoryItemResponseDto,
  OffsetPaginationMetaDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseAchievementHistoryResult {
  items: readonly AchievementHistoryEntry[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  /** True while revalidation is in flight and cached items are present. */
  isStale: boolean;
}

// ─── Wire type ───────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getMyAchievementHistory`.
 *
 * Shape: `{ data?: AchievementHistoryItemResponseDto[],
 *           meta?: { pagination?: OffsetPaginationMetaDto } }`.
 */
type GetMyAchievementHistoryWireResponse = {
  data?: AchievementHistoryItemResponseDto[];
  meta?: { pagination?: OffsetPaginationMetaDto };
};

// ─── Constants ───────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the authenticated user's achievement history through offset
 * pagination.
 *
 * Returns safe fallback (`items: []`, `isLoading: false`,
 * `error: null`) when:
 *
 * - `phase5_achievements` is `'placeholder'`.
 * - The user is unauthenticated.
 *
 * Category filter changes reset pagination to the first page.
 */
export function useAchievementHistory(
  filters: Partial<AchievementHistoryFilters> = DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
): UseAchievementHistoryResult {
  const flagValue = getFeatureFlagValue("phase5_achievements");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState } = useAuthBootstrap();
  const isAuthenticated = bootstrapState === "authenticated";

  // SWR cache key. Disabled sentinel when flag is off or
  // user is unauthenticated.
  const key = useMemo(
    () =>
      isFlagPlaceholder || !isAuthenticated
        ? (["achievements", "me", "history", "disabled"] as const)
        : ACHIEVEMENT_CACHE_KEYS.history({
            page: filters.page,
            limit: filters.limit,
            category: filters.category,
          }),
    [
      isFlagPlaceholder,
      isAuthenticated,
      filters.page,
      filters.limit,
      filters.category,
    ],
  );

  const fetcher = useMemo(
    () =>
      async ({
        page,
      }: OffsetFetcherArgs<AchievementHistoryFilters>) => {
        if (isFlagPlaceholder || !isAuthenticated) {
          return {
            items: [] as readonly AchievementHistoryEntry[],
            page,
            total: 0,
            hasMore: false,
            limit: 0,
          };
        }

        const limit = filters.limit ?? DEFAULT_LIMIT;
        // Convert 1-based page to 0-based offset.
        const offset = (page - 1) * limit;

        const wire = (await getMyAchievementHistory({
          offset,
          limit,
        })) as unknown as GetMyAchievementHistoryWireResponse;

        const entries = (wire.data ?? []).map(toAchievementHistoryEntry);
        const pagination = wire.meta?.pagination;
        return {
          items: entries,
          page: pagination?.page ?? page,
          total: pagination?.total ?? entries.length,
          hasMore: pagination?.hasMore ?? false,
          limit: pagination?.limit ?? limit,
        };
      },
    [isFlagPlaceholder, isAuthenticated, filters.limit],
  );

  const result = useCursorPaginated<
    AchievementHistoryEntry,
    AchievementHistoryFilters
  >({
    key,
    fetcher,
    params: {
      page: filters.page,
      limit: filters.limit,
      category: filters.category,
    },
    paginationKind: "offset",
  });

  const isStale = result.items.length > 0 && result.isLoading;

  // Safe fallback for feature flag off / unauthenticated.
  if (isFlagPlaceholder || !isAuthenticated) {
    return {
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: () => {
        /* no-op */
      },
      error: null,
      refresh: async () => {
        /* no-op */
      },
      isStale: false,
    };
  }

  return {
    items: result.items,
    isLoading: result.isLoading,
    isLoadingMore: result.isLoadingMore,
    hasMore: result.hasMore,
    loadMore: result.loadMore,
    error: result.error as ApiError | null,
    refresh: result.refresh,
    isStale,
  };
}

export type {
  AchievementHistoryEntry,
  AchievementHistoryFilters,
  AchievementErrorCode,
};