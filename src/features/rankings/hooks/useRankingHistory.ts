"use client";

/**
 * `useRankingHistory` — authenticated user's ranking history hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B3.
 *
 * ## What this hook owns
 *
 * - Fetch the authenticated user's ranking history through the service
 *   layer (`getMyRankingHistory`).
 * - Project each wire entry to the `RankingHistoryEntry` feature type
 *   with an `id` alias so SWR deduplication works by snapshot date.
 * - Expose `isStale` while revalidation is in flight and cached data
 *   is present.
 * - Return safe fallback state when unauthenticated or when
 *   `phase5_rankings` is `'placeholder'`.
 *
 * ## Pagination
 *
 * The wire envelope is a bare array (`RankingHistoryItemDto[]`) at
 * this commit; the service returns no pagination metadata. The hook
 * exposes the items directly; a future commit may add offset
 * pagination when the backend exposes `OffsetPaginationMetaDto` for
 * this endpoint.
 *
 * ## Server authority
 *
 * The backend-provided rank is authoritative even if it decreases
 * (e.g. after a period reset). The hook never smooths or hides a
 * rank drop.
 *
 * ## Eventual consistency
 *
 * `isStale` flips to `true` while SWR revalidation is in flight and
 * the previous items are still present. Cached values are retained
 * during revalidation.
 */

import { useCallback, useMemo, useRef } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRankingHistory } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toRankingHistoryEntry,
  type RankingErrorCode,
  type RankingHistoryEntry,
  type RankingHistoryFilters,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { RankingHistoryItemDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRankingHistoryResult {
  items: readonly RankingHistoryEntry[];
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached items are present. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the authenticated user's ranking history.
 *
 * The wire envelope is a bare array at this commit; pagination is
 * reserved for a future backend addition. Returns safe fallback
 * (`items: []`, `isLoading: false`, `error: null`) when:
 *
 * - `phase5_rankings` is `'placeholder'`.
 * - The user is unauthenticated.
 */
export function useRankingHistory(
  _filters: RankingHistoryFilters = {},
): UseRankingHistoryResult {
  const flagValue = getFeatureFlagValue("phase5_rankings");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";

  // Disabled sentinel key when flag is off or user is unauthenticated.
  const key = useMemo(
    () =>
      isFlagPlaceholder || !isAuthenticated
        ? null
        : RANKING_CACHE_KEYS.myHistory(_filters),
    [isFlagPlaceholder, isAuthenticated, _filters],
  );

  // Track the timestamp of the last successful response for downstream
  // freshness consumers; the hook surface itself does not expose it.
  const lastValidatedAtRef = useRef<string | null>(null);

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || !isAuthenticated) {
        return [] as RankingHistoryEntry[];
      }
      const wire = (await getMyRankingHistory()) as
        | RankingHistoryItemDto[]
        | null
        | undefined;
      const items = (wire ?? []).map(toRankingHistoryEntry);
      if (items.length > 0 || wire) {
        lastValidatedAtRef.current = new Date().toISOString();
      }
      return items;
    },
    [isFlagPlaceholder, isAuthenticated],
  );

  const result = useSingleWithRetry<RankingHistoryEntry[]>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Safe fallback for feature flag off / unauthenticated.
  if (isFlagPlaceholder || !isAuthenticated) {
    return {
      items: [],
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
    };
  }

  return {
    items: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
  };
}

export type { RankingHistoryEntry, RankingHistoryFilters, RankingErrorCode };