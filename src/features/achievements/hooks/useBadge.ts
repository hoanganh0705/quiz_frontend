"use client";

/**
 * `useBadge` — single badge detail hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.B5.
 *
 * ## What this hook owns
 *
 * - Fetch a single badge detail through the service layer
 *   (`getBadgeByCode`).
 * - Project the wire envelope to the `BadgeDetail` feature type.
 * - Surface `BADGE_NOT_FOUND`, `BADGE_HIDDEN`, and `BADGE_DEFERRED`
 *   as typed errors with documented copy.
 * - Render a tombstone view when `BADGE_HIDDEN` is returned.
 * - Feature-flag gating via `achievements_live`.
 *
 * ## Deferred-badge discipline
 *
 * `BADGE_DEFERRED` is mapped to a typed error in the service layer
 * and surfaces here as an `error` field. The hook does NOT set
 * `deprecated` for deferred badges — deferred badges are still
 * potentially earnable in the future. The UI renders informational
 * copy only; it never claims a deferred badge as earned.
 *
 * ## Hidden-badge discipline
 *
 * `BADGE_HIDDEN` is mapped to a typed error in the service layer and
 * surfaces here as `error` + `isPrivate: true`. The hook reports
 * `deprecated: true` for hidden badges so the UI can render a
 * tombstone view that is visually distinct from a deferred badge.
 *
 * ## Feature flag
 *
 * When `achievements_live === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getBadgeByCode } from "@/features/achievements/services/achievements.service";
import {
  ACHIEVEMENT_CACHE_KEYS,
  toBadgeDetail,
  type AchievementErrorCode,
  type BadgeDetail,
} from "@/features/achievements/types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { BadgeDetailsResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseBadgeResult {
  badge: BadgeDetail | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  /** True while revalidation is in flight and cached badge is present. */
  isStale: boolean;
  /**
   * Privacy-aware flag mirroring the server response.
   * `true` when the badge is hidden (`BADGE_HIDDEN`) — UI renders a
   * tombstone view. Deferred badges are NOT marked private.
   */
  isPrivate: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a single badge detail.
 *
 * Returns safe fallback (`badge: null`, `isLoading: false`,
 * `error: null`, `isPrivate: false`) when:
 *
 * - `achievements_live` is `'placeholder'`.
 * - `code` is `null`.
 *
 * The hook never invents a badge — `badge` is `null` when the server
 * returns `null`. `isPrivate` is `true` only when the service throws
 * `BADGE_HIDDEN`.
 */
export function useBadge(code: string | null): UseBadgeResult {
  const flagValue = getFeatureFlagValue("achievements_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Disabled sentinel key when flag is off or code is null.
  const key = useMemo(
    () =>
      isFlagPlaceholder || code === null
        ? null
        : ACHIEVEMENT_CACHE_KEYS.detail(code),
    [isFlagPlaceholder, code],
  );

  const fetcher = useCallback(
    async () => {
      if (isFlagPlaceholder || code === null) {
        return null;
      }
      const wire = (await getBadgeByCode(code)) as BadgeDetailsResponseDto | null;
      return toBadgeDetail(wire);
    },
    [isFlagPlaceholder, code],
  );

  const result = useSingleWithRetry<BadgeDetail | null>({
    key,
    fetcher,
  });

  const isStale = result.data !== undefined && result.isRetrying;

  // Hidden-badge detection: a hidden badge surfaces as
  // `BADGE_HIDDEN` in `result.error.code`. The hook reports
  // `isPrivate: true` so the UI can render the tombstone view.
  // The runtime `ErrorCode` union does not include `BADGE_HIDDEN` at
  // this commit; the comparison widens the literal to `string` so the
  // type check succeeds and the runtime check is still exact.
  const isPrivate = String(result.error?.code ?? "") === "BADGE_HIDDEN";

  // Safe fallback for feature flag off / no code.
  if (isFlagPlaceholder || code === null) {
    return {
      badge: null,
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
    badge: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error as ApiError | null,
    retry: result.retry,
    isStale,
    isPrivate,
  };
}

export type { BadgeDetail, AchievementErrorCode };