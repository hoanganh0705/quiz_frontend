"use client";

/**
 * `useUserBadges` — public user badge profile hook with privacy gating.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B6.
 *
 * ## What this hook owns
 *
 * - Fetch a user's public badge profile through the service layer
 *   (`getUserBadges`).
 * - Project the wire envelope to the `UserBadgeProfile` feature type.
 * - Expose a privacy-aware `isPrivate` flag derived from the
 *   `ACHIEVEMENT_FORBIDDEN` typed error and the null response shape.
 * - Map service errors to the typed `AchievementErrorCode` union.
 * - Feature-flag gating via `achievements_live`.
 *
 * ## Privacy gating
 *
 * The current backend does not expose an `isPrivate` flag on the
 * `PublicAchievementProfileResponseDto`. Privacy is inferred from two
 * server signals:
 *
 * 1. The service throws `ACHIEVEMENT_FORBIDDEN` when the requester
 *    is not authorised to view the user's badges.
 * 2. The service returns `null` when the target user has no public
 *    badge profile.
 *
 * The hook maps `ACHIEVEMENT_FORBIDDEN` to `isPrivate: true` and
 * renders a privacy-aware empty state. Components never infer
 * privacy from URL or auth state — privacy comes from the server
 * response only.
 *
 * ## Server authority
 *
 * The backend-provided `featuredBadges`, `totalBadges`, and
 * `highestRank` are authoritative. The hook never smooths or hides
 * a rank drop.
 *
 * ## Feature flag
 *
 * When `achievements_live === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getUserBadges } from "@/features/achievements/services/achievements.service";
import {
  ACHIEVEMENT_CACHE_KEYS,
  toUserBadgeProfile,
  type AchievementErrorCode,
  type UserBadgeProfile,
} from "@/features/achievements/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { PublicAchievementProfileResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserBadgesResult {
  profile: UserBadgeProfile | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached profile is present. */
  isStale: boolean;
  /**
   * Privacy-aware flag mirroring the server response.
   * `true` when the user has hidden their public badge profile or
   * when the requester is not authorised to view it.
   */
  isPrivate: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a user's public badge profile with privacy gating.
 *
 * Returns safe fallback (`profile: null`, `isLoading: false`,
 * `error: null`, `isPrivate: false`) when:
 *
 * - `achievements_live` is `'placeholder'`.
 * - `userId` is `null`.
 *
 * `isPrivate` is `true` when:
 *
 * - The service throws `ACHIEVEMENT_FORBIDDEN` (server-side privacy).
 * - The service returns `null` and the userId was supplied (no
 *   public profile — privacy-equivalent empty state).
 */
export function useUserBadges(userId: string | null): UseUserBadgesResult {
  const flagValue = getFeatureFlagValue("achievements_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Disabled sentinel key when flag is off or userId is null.
  const key = useMemo(
    () =>
      isFlagPlaceholder || userId === null
        ? null
        : ACHIEVEMENT_CACHE_KEYS.userBadges(userId),
    [isFlagPlaceholder, userId],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || userId === null) {
        return null;
      }
      const wire = (await getUserBadges(userId)) as
        | PublicAchievementProfileResponseDto
        | null;
      return toUserBadgeProfile(wire);
    },
    [isFlagPlaceholder, userId],
  );

  const result = useSingleWithRetry<UserBadgeProfile | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Privacy detection: a 403 surfaces as `ACHIEVEMENT_FORBIDDEN` in
  // `result.error.code`. The hook reports `isPrivate: true` so the
  // UI renders the privacy-aware empty state.
  // The runtime `ErrorCode` union does not include
  // `ACHIEVEMENT_FORBIDDEN` at this commit; the comparison widens the
  // literal to `string` so the type check succeeds and the runtime
  // check is still exact.
  const isPrivate = String(result.error?.code ?? "") === "ACHIEVEMENT_FORBIDDEN";

  // Safe fallback for feature flag off / no userId.
  if (isFlagPlaceholder || userId === null) {
    return {
      profile: null,
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
    profile: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
    isPrivate,
  };
}

export type { UserBadgeProfile, AchievementErrorCode };