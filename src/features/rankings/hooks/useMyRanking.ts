"use client";

/**
 * `useMyRanking` — authenticated user's personal ranking summary hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B1.
 *
 * ## What this hook owns
 *
 * - Fetch the authenticated user's ranking summary through the
 *   service layer (`getMyRanking`).
 * - Project the wire envelope to the `RankingSummary` feature type.
 * - Expose a freshness indicator (`isStale`, `lastValidatedAt`) so the
 *   UI can communicate eventual consistency without showing
 *   contradictory optimistic values.
 * - Return safe fallback state when unauthenticated or when the
 *   `rankings_live` feature flag is `'placeholder'`.
 *
 * ## Server authority
 *
 * The backend-provided rank is authoritative even if it decreases
 * after a period reset. Components never smooth or hide a rank drop.
 *
 * ## Eventual consistency
 *
 * `isStale` flips to `true` while SWR revalidation is in flight and
 * the previous `summary` is still present. Cached values are
 * retained during revalidation; `lastValidatedAt` updates only on
 * successful response.
 *
 * ## Auth reads
 *
 * The service is auth-gated. Unauthenticated users see safe fallback
 * (no fetch, no error, no summary).
 *
 * ## Feature flag
 *
 * When `rankings_live === 'placeholder'`, the hook short-circuits
 * to safe fallback. No service call fires; the SWR key is the
 * disabled sentinel.
 */

import { useCallback, useMemo, useState } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyRanking } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toRankingSummary,
  type RankingErrorCode,
  type RankingFreshness,
  type RankingSummary,
} from "@/features/rankings/types";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { UserRankResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseMyRankingResult {
  /** Server-provided summary, or `null` when the user has no ranking. */
  summary: RankingSummary | null;
  isLoading: boolean;
  error: ApiError | null;
  /** Manual revalidation action. */
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached `summary` is present. */
  isStale: boolean;
  /** ISO 8601 timestamp of the last successful response, or `null`. */
  lastValidatedAt: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the authenticated user's ranking summary.
 *
 * Returns safe fallback (`summary: null`, `isLoading: false`,
 * `error: null`) when:
 *
 * - `rankings_live` is `'placeholder'`.
 * - The user is unauthenticated.
 *
 * The hook never invents a rank — `summary` is `null` when the
 * server returns a ghost/no-rank response. The `isStale` flag is
 * derived from the underlying `useSingleWithRetry` retry state and
 * the cached data presence.
 */
export function useMyRanking(): UseMyRankingResult {
  const flagValue = getFeatureFlagValue("rankings_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState, currentUser } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";
  const userId =
    typeof currentUser?.userId === "string" ? currentUser.userId : "";

  // Disabled sentinel key when flag is off or user is not authenticated.
  const key = useMemo(
    () =>
      isFlagPlaceholder || !isAuthenticated
        ? null
        : RANKING_CACHE_KEYS.mySummary(),
    [isFlagPlaceholder, isAuthenticated],
  );

  // Track the timestamp of the last successful response. Updated only
  // on success — never on error — so the freshness indicator reflects
  // the moment data was confirmed by the server.
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || !isAuthenticated) {
        return null;
      }
      const wire = (await getMyRanking()) as UserRankResponseDto | null;
      const summary = toRankingSummary(wire, userId);
      if (summary) {
        setLastValidatedAt(new Date().toISOString());
      }
      return summary;
    },
    [isFlagPlaceholder, isAuthenticated, userId],
  );

  const result = useSingleWithRetry<RankingSummary | null>({
    key,
    fetcher,
  });

  // Freshness projection: stale while revalidating and cached data present.
  const isStale = result.data !== undefined && result.isRetrying;

  // Safe fallback for feature flag off / unauthenticated.
  if (isFlagPlaceholder || !isAuthenticated) {
    return {
      summary: null,
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
      lastValidatedAt: null,
    };
  }

  return {
    summary: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
    lastValidatedAt,
  };
}

// ─── Re-exports for consumers ─────────────────────────────────────────────

export type { RankingFreshness, RankingSummary, RankingErrorCode };