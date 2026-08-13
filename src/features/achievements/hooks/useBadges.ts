"use client";

/**
 * `useBadges` — badge catalog hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B5.
 *
 * ## What this hook owns
 *
 * - Fetch the full badge catalog through the service layer
 *   (`listBadges`).
 * - Consume the `normalizeBadgeArray` adapter from Epic 5.1 so the
 *   hook returns a stable `BadgeSummary[]` regardless of whether the
 *   wire response was a bare array or an envelope.
 * - Project each entry to the `BadgeSummary` feature type.
 * - Map service errors to the typed `AchievementErrorCode` union.
 * - Feature-flag gating via `achievements_live`.
 *
 * ## Bare-array handling
 *
 * `listBadges` is documented in the master plan as one of the
 * endpoints that may return a bare array. The service wrapper
 * already applies `normalizeBadgeArray` so the hook surface is
 * always `BadgeSummary[]` — components never branch on response
 * shape.
 *
 * ## Deferred-badge discipline
 *
 * `BADGE_DEFERRED` is mapped to a typed error in the service layer
 * and surfaces here as an `error` field. UI copy must never promise
 * a deferred badge as earned; the catalog distinguishes
 * `'available'` from `'earned'` via the `BadgeStatus` projection
 * (computed at render time from the user's earned-badges list).
 *
 * ## Feature flag
 *
 * When `achievements_live === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { listBadges } from "@/features/achievements/services/achievements.service";
import {
  DEFAULT_BADGE_CATALOG_FILTERS,
  ACHIEVEMENT_CACHE_KEYS,
  toBadgeSummary,
  type AchievementErrorCode,
  type BadgeCatalogFilters,
  type BadgeSummary,
} from "@/features/achievements/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { BadgeCatalogItemResponseDto } from "@/lib/api/generated/schemas";
import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseBadgesResult {
  badges: readonly BadgeSummary[];
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached badges are present. */
  isStale: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the badge catalog.
 *
 * Returns safe fallback (`badges: []`, `isLoading: false`,
 * `error: null`) when `achievements_live === 'placeholder'`.
 *
 * The catalog wire envelope is a bare array at this commit; the
 * service layer applies `normalizeBadgeArray` so the hook surface is
 * always `BadgeSummary[]`.
 */
export function useBadges(
  filters: BadgeCatalogFilters = DEFAULT_BADGE_CATALOG_FILTERS,
): UseBadgesResult {
  const flagValue = getFeatureFlagValue("achievements_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // SWR cache key. Disabled sentinel when flag is off so no fetch fires.
  const key = useMemo(
    () =>
      isFlagPlaceholder
        ? (["achievements", "catalog", "disabled"] as const)
        : ACHIEVEMENT_CACHE_KEYS.catalog(filters),
    [isFlagPlaceholder, filters],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder) {
        return [] as BadgeSummary[];
      }
      // Phase 6: the service no longer applies the legacy
      // `normalizeBadgeArray` adapter — the SDK now returns the
      // paginated envelope directly. The structural cast preserves
      // the `toBadgeSummary` overload union (it accepts either the
      // legacy normalized shape or the SDK shape).
      const wire =
        ((await listBadges()) as unknown as Array<
          BadgeCatalogItemResponseDto | NormalizedBadge
        >) ?? [];
      return wire.map(toBadgeSummary);
    },
    [isFlagPlaceholder],
  );

  const result = useSingleWithRetry<BadgeSummary[]>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Safe fallback for feature flag off.
  if (isFlagPlaceholder) {
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

export type { BadgeSummary, BadgeCatalogFilters, AchievementErrorCode };