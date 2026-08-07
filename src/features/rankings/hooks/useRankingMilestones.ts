"use client";

/**
 * `useRankingMilestones` — authenticated user's ranking milestones hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B3.
 *
 * ## What this hook owns
 *
 * - Fetch the authenticated user's ranking milestones through the
 *   service layer (`getMyRankingMilestones`).
 * - Project each wire entry to the `RankingMilestone` feature type
 *   with an `id` alias so SWR deduplication works by milestone code.
 * - Expose `isStale` while revalidation is in flight and cached data
 *   is present.
 * - Return safe fallback state when unauthenticated or when
 *   `phase5_rankings` is `'placeholder'`.
 *
 * ## Pagination
 *
 * The wire envelope is a bare array (`RankingMilestoneDto[]`); the
 * hook returns the items directly. No pagination is exposed — the
 * milestone set is finite and bounded by the milestone enum.
 *
 * ## Server authority
 *
 * The wire enum (`RankingMilestoneDtoMilestone`) includes
 * `TOP_10000`, `TOP_1000`, `TOP_100`, `TOP_50`, `TOP_10`, `TOP_3`,
 * `TOP_1`. The documented subset is `TOP_100`, `TOP_10`, `TOP_1`
 * (per master plan §5.5). The hook surfaces all milestones returned
 * by the server; the component layer is responsible for styling the
 * documented subset distinctly.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRankingMilestones } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toRankingMilestone,
  type RankingErrorCode,
  type RankingMilestone,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { RankingMilestoneDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRankingMilestonesResult {
  milestones: readonly RankingMilestone[];
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached milestones are present. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the authenticated user's ranking milestones.
 *
 * Returns safe fallback (`milestones: []`, `isLoading: false`,
 * `error: null`) when:
 *
 * - `phase5_rankings` is `'placeholder'`.
 * - The user is unauthenticated.
 */
export function useRankingMilestones(): UseRankingMilestonesResult {
  const flagValue = getFeatureFlagValue("phase5_rankings");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";

  // Disabled sentinel key when flag is off or user is unauthenticated.
  const key = useMemo(
    () =>
      isFlagPlaceholder || !isAuthenticated
        ? null
        : RANKING_CACHE_KEYS.myMilestones(),
    [isFlagPlaceholder, isAuthenticated],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || !isAuthenticated) {
        return [] as RankingMilestone[];
      }
      const wire = (await getMyRankingMilestones()) as
        | RankingMilestoneDto[]
        | null
        | undefined;
      return (wire ?? []).map(toRankingMilestone);
    },
    [isFlagPlaceholder, isAuthenticated],
  );

  const result = useSingleWithRetry<RankingMilestone[]>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Safe fallback for feature flag off / unauthenticated.
  if (isFlagPlaceholder || !isAuthenticated) {
    return {
      milestones: [],
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
    };
  }

  return {
    milestones: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
  };
}

export type { RankingMilestone, RankingErrorCode };