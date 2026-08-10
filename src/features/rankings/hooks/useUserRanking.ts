"use client";

/**
 * `useUserRanking` — public user ranking summary hook with privacy gating.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B4.
 *
 * ## What this hook owns
 *
 * - Fetch a user's public ranking summary through the service layer
 *   (`getUserRanking`).
 * - Project the wire envelope to the `UserRanking` feature type.
 * - Expose a privacy-aware `isPrivate` flag derived from the
 *   `RANKING_FORBIDDEN` typed error and the null response shape.
 * - Map service errors to the typed `RankingErrorCode` union.
 * - Feature-flag gating via `rankings_live`.
 *
 * ## Privacy gating
 *
 * The current backend does not expose an `isPrivate` flag on the
 * ranking response (`UserRankResponseDto`). Privacy is inferred from
 * two server signals:
 *
 * 1. The service throws `RANKING_FORBIDDEN` when the requester is
 *    not authorised to view the user's ranking.
 * 2. The service returns `null` when the target user has no ranking
 *    data.
 *
 * The hook maps `RANKING_FORBIDDEN` to `isPrivate: true` and renders
 * a "Ranking hidden" empty state. Components never infer privacy
 * from URL or auth state — privacy comes from the server response
 * only.
 *
 * ## Server authority
 *
 * The backend-provided rank is authoritative even if it decreases
 * (e.g. after a period reset). The hook never smooths or hides a
 * rank drop.
 *
 * ## Feature flag
 *
 * When `rankings_live === 'placeholder'`, the hook returns safe
 * fallback. No service call fires.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getUserRanking } from "@/features/rankings/services/rankings.service";
import {
  RANKING_CACHE_KEYS,
  toUserRanking,
  type RankingErrorCode,
  type UserRanking,
} from "@/features/rankings/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { UserRankResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserRankingResult {
  /** Server-provided ranking, or `null` when hidden / not found. */
  ranking: UserRanking | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached ranking is present. */
  isStale: boolean;
  /**
   * Privacy-aware flag mirroring the server response.
   * `true` when the user has hidden their ranking or when the
   * requester is not authorised to view it.
   */
  isPrivate: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a user's public ranking summary with privacy gating.
 *
 * Returns safe fallback (`ranking: null`, `isLoading: false`,
 * `error: null`, `isPrivate: false`) when:
 *
 * - `rankings_live` is `'placeholder'`.
 * - `userId` is `null`.
 *
 * `isPrivate` is `true` when:
 *
 * - The service throws `RANKING_FORBIDDEN` (server-side privacy).
 * - The service returns `null` and the userId was supplied (no
 *   ranking data — privacy-equivalent empty state).
 */
export function useUserRanking(
  userId: string | null,
): UseUserRankingResult {
  const flagValue = getFeatureFlagValue("rankings_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Disabled sentinel key when flag is off or userId is null.
  const key = useMemo(
    () =>
      isFlagPlaceholder || userId === null
        ? null
        : RANKING_CACHE_KEYS.user(userId),
    [isFlagPlaceholder, userId],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || userId === null) {
        return null;
      }
      const wire = (await getUserRanking(userId)) as UserRankResponseDto | null;
      return toUserRanking(wire, userId);
    },
    [isFlagPlaceholder, userId],
  );

  const result = useSingleWithRetry<UserRanking | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Privacy detection: a 403 surfaces as `RANKING_FORBIDDEN` in
  // `result.error.code`. The hook reports `isPrivate: true` in that
  // case so the UI renders the privacy-aware empty state instead of
  // a generic error.
  // The runtime `ErrorCode` union does not include `RANKING_FORBIDDEN`
  // or `RANKING_NOT_FOUND` at this commit; the comparison widens the
  // literal to `string` so the type check succeeds and the runtime
  // check is still exact.
  const errorCode = String(result.error?.code ?? "");
  const isPrivate =
    errorCode === "RANKING_FORBIDDEN" || errorCode === "RANKING_NOT_FOUND";

  // Safe fallback for feature flag off / no userId.
  if (isFlagPlaceholder || userId === null) {
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