"use client";

/**
 * `useUserSocialStats` — Per-user social stats with privacy-aware
 * visibility mapping.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.D1.
 *
 * ## What this hook owns
 *
 * The single read hook the `UserStatsCard` (TKT-6.3.E3) calls to
 * fetch a user's public social stats. The hook:
 *
 *   - Calls the verified service wrapper `getUserSocialStats`
 *     (added to `services/social.service.ts` alongside this hook
 *     to satisfy the dependency edges declared in the ticket
 *     plan).
 *   - Projects the wire DTO through `toSocialUserStats` so
 *     consumers receive the canonical `SocialUserStatsDto`
 *     projection (with stable defaults for missing fields).
 *   - Maps the four privacy-related backend codes
 *     (`SOCIAL_USER_NOT_FOUND`, `SOCIAL_FRIEND_LIST_FORBIDDEN`,
 *     `SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`) to a
 *     `visibility` field so the `UserStatsCard` can render
 *     `PrivacyRestrictedNotice` without branching on raw HTTP
 *     status.
 *   - Short-circuits to the safe fallback when the feature flag
 *     is `'placeholder'` or when the viewer IS the target
 *     (the viewer does not need a privacy gate for their own
 *     stats; the My Analytics page handles that surface).
 *
 * ## Visibility contract
 *
 *   - `'visible'` — the stats should render normally.
 *   - `'private'` — the target's profile is private or the
 *     viewer is not a friend; render the privacy notice.
 *   - `'blocked_viewer'` — the target has blocked the viewer;
 *     render the privacy notice.
 *   - `'blocked_by_viewer'` — the viewer has blocked the
 *     target; the target's stats are hidden behind the
 *     block.
 *   - `'not_found'` — the user id does not resolve.
 *
 * The hook never throws to the UI; the page receives
 * `{ stats: null, error: null, visibility }` and renders the
 * appropriate copy.
 *
 * ## Why this is a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive
 * the placeholder (`AnalyticsPlaceholder` for the `stats` kind)
 * until the client takes over, per the Story 6.3 SSR safety
 * plan.
 */

import { useCallback, useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { toSocialUserStatsFromEnvelope } from "@/features/social/dto-adapters-analytics";
import { getUserSocialStats } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialUserStatsDto,
} from "@/features/social/types";
import { useEventuallyConsistentQuery } from "@/features/social/hooks/useEventuallyConsistentQuery";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { ApiError } from "@/lib/api";

/**
 * The privacy-aware visibility field the `UserStatsCard` reads
 * to decide which copy / icon to render.
 */
export type UserSocialStatsVisibility =
  | "visible"
  | "private"
  | "blocked_viewer"
  | "blocked_by_viewer"
  | "not_found";

export interface UseUserSocialStatsResult {
  stats: SocialUserStatsDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => void;
  visibility: UserSocialStatsVisibility;
}

/**
 * Pure resolver — exposed so the spec can pin the privacy mapping
 * without mocking the hook.
 */
export function resolveUserSocialStatsVisibility(
  code: string | undefined,
): UserSocialStatsVisibility {
  if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
  if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
  if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
  if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
  return "visible";
}

const PLACEHOLDER_RESULT: UseUserSocialStatsResult = Object.freeze({
  stats: null,
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => undefined,
  visibility: "not_found",
});

const SELF_RESULT: UseUserSocialStatsResult = Object.freeze({
  stats: null,
  isLoading: false,
  isStale: false,
  error: null,
  retry: () => undefined,
  visibility: "visible",
});

/**
 * Read a user's social stats with privacy-aware mapping.
 *
 * When the viewer IS the target (`userId === currentUserId`), the
 * hook short-circuits to the "self" fallback — the page does not
 * need a privacy gate for the viewer's own stats (the My
 * Analytics page covers that surface).
 */
export function useUserSocialStats(
  userId: string,
): UseUserSocialStatsResult {
  const flagValue = getFeatureFlagValue("phase6_social");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const viewerId = auth.currentUser?.userId ?? null;
  const isAuthenticated = auth.isAuthenticated;
  const isSelf = viewerId !== null && userId === viewerId;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (isSelf) return null;
    return SOCIAL_CACHE_KEYS.makeUserSocialStatsKey(userId);
  }, [isFlagPlaceholder, isAuthenticated, isSelf, userId]);

  const fetcher = useCallback(async (): Promise<SocialUserStatsDto> => {
    const envelope = await getUserSocialStats(userId);
    return toSocialUserStatsFromEnvelope(envelope);
  }, [userId]);

  const result = useEventuallyConsistentQuery<SocialUserStatsDto>(
    key,
    fetcher,
  );

  if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
  if (isSelf) return SELF_RESULT;

  const code = result.error?.code;
  const visibility = resolveUserSocialStatsVisibility(code);

  // Suppress the error when the visibility is a privacy variant;
  // the page renders the privacy notice, not the error.
  const error =
    visibility !== "visible" && result.error !== null ? null : result.error;
  const stats = visibility !== "visible" ? null : result.data;

  return {
    stats,
    isLoading: result.isLoading,
    isStale: result.isStale,
    error,
    retry: result.retry,
    visibility,
  };
}