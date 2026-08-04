"use client";

/**
 * `useMyBadges` — authenticated user's earned badges hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B6.
 *
 * ## What this hook owns
 *
 * - Fetch the authenticated user's earned badges through the service
 *   layer (`getMyBadges`).
 * - Consume the `normalizeBadgeArray` adapter from Epic 5.1 so the
 *   hook returns a stable `EarnedBadge[]` regardless of whether the
 *   wire response was a bare array or an envelope.
 * - Project each entry to the `EarnedBadge` feature type.
 * - Map service errors to the typed `AchievementErrorCode` union.
 * - Feature-flag gating via `phase5_achievements`.
 *
 * ## Auth requirement
 *
 * Earned badges are a private read — the hook short-circuits to safe
 * fallback when the user is unauthenticated. The fallback is
 * indistinguishable from "no badges earned" by design; the auth gate
 * runs before the SWR key activates.
 *
 * ## Progress discipline
 *
 * The hook does NOT optimistically join progress data. Progress is
 * informational only; the UI never promises completion when
 * `progress.percent < 100`. A dedicated `useBadgeProgress` hook
 * (out of scope for this story) joins progress when needed.
 *
 * ## Feature flag
 *
 * When `phase5_achievements === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getMyBadges } from "@/features/achievements/services/achievements.service";
import {
  ACHIEVEMENT_CACHE_KEYS,
  toEarnedBadge,
  type AchievementErrorCode,
  type EarnedBadge,
} from "@/features/achievements/types";
import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseMyBadgesResult {
  badges: readonly EarnedBadge[];
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached badges are present. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the authenticated user's earned badges.
 *
 * Returns safe fallback (`badges: []`, `isLoading: false`,
 * `error: null`) when:
 *
 * - `phase5_achievements` is `'placeholder'`.
 * - The user is unauthenticated.
 *
 * The wire envelope may be a bare array; the service layer applies
 * `normalizeBadgeArray` so the hook surface is always `EarnedBadge[]`.
 */
export function useMyBadges(): UseMyBadgesResult {
  const flagValue = getFeatureFlagValue("phase5_achievements");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { bootstrapState } = useAuthBootstrap();
  const isAuthenticated = bootstrapState === "authenticated";

  // Disabled sentinel key when flag is off or user is unauthenticated.
  const key = useMemo(
    () =>
      isFlagPlaceholder || !isAuthenticated
        ? null
        : ACHIEVEMENT_CACHE_KEYS.myBadges(),
    [isFlagPlaceholder, isAuthenticated],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || !isAuthenticated) {
        return [] as EarnedBadge[];
      }
      const wire = (await getMyBadges()) as NormalizedBadge[];
      return wire
        .map((entry) => toEarnedBadge(entry))
        .filter((entry): entry is EarnedBadge => entry !== null);
    },
    [isFlagPlaceholder, isAuthenticated],
  );

  const result = useSingleWithRetry<EarnedBadge[]>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Safe fallback for feature flag off / unauthenticated.
  if (isFlagPlaceholder || !isAuthenticated) {
    return {
      badges: [],
      isLoading: false,
      error: null,
      retry: async () => {
        /* no-op */
      },
      isStale: false,
    };
  }

  return {
    badges: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
  };
}

export type { EarnedBadge, AchievementErrorCode };