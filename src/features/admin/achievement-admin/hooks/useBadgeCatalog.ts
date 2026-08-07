'use client';

/**
 * `features/admin/achievement-admin/hooks/useBadgeCatalog.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C3.
 *
 * ## What this hook owns
 *
 * - Fetch the badge catalog through the admin service layer
 *   (`listBadges` — reused from Phase 5 via `achievements.service`).
 * - Project `NormalizedBadge[]` (the wire type returned by `listBadges`)
 *   to `BadgeSummary[]` via the Phase 5 `toBadgeSummary` projector.
 * - Expose `{ badges, isLoading, error }` for the badge filter or any
 *   surface that needs the full catalog.
 * - Feature-flag gating via `phase7_admin_achievement`.
 *
 * ## Catalog is read-only
 *
 * Mutations are not in scope for this hook.
 *
 * ## Feature flag
 *
 * When `phase7_admin_achievement === 'placeholder'`, the hook returns
 * safe fallback. No service call fires.
 */

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import { listBadges } from '@/features/achievements/services/achievements.service';
import {
  toBadgeSummary,
  type BadgeSummary,
  ACHIEVEMENT_CACHE_KEYS,
} from '@/features/achievements/types';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseBadgeCatalogOptions {
  /** Optional tier filter. */
  readonly tier?: string | null;
  /** Optional category filter. */
  readonly category?: string | null;
}

export interface UseBadgeCatalogResult {
  /** Full badge catalog projected to `BadgeSummary[]`. */
  readonly badges: readonly BadgeSummary[];
  /** True while fetching. */
  readonly isLoading: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the badge catalog for the achievement admin surface.
 *
 * Returns safe fallback when the flag is off.
 */
export function useBadgeCatalog(
  options: UseBadgeCatalogOptions = {},
): UseBadgeCatalogResult {
  const { tier = null, category = null } = options ?? {};

  const flagValue = getFeatureFlagValue('phase7_admin_achievement');
  const isFlagPlaceholder = flagValue === 'placeholder';

  // Admin-scoped cache key that mirrors the Phase 5 catalog key shape.
  const key = useMemo(
    () =>
      isFlagPlaceholder
        ? (['admin', 'achievement', 'catalog', 'disabled'] as const)
        : ACHIEVEMENT_CACHE_KEYS.catalog({
            tier: tier ?? undefined,
            category: category ?? undefined,
          }),
    [isFlagPlaceholder, tier, category],
  );

  const fetcher = useCallback(async (): Promise<BadgeSummary[]> => {
    if (isFlagPlaceholder) return [];
    const wire = await listBadges();
    return (wire ?? []).map(toBadgeSummary);
  }, [isFlagPlaceholder]);

  const { data, error, isLoading } = useSWR<BadgeSummary[], ApiError>(
    key,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  return {
    badges: data ?? [],
    isLoading,
    error: error ?? null,
  };
}
