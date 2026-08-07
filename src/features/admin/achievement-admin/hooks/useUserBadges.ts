'use client';

/**
 * `features/admin/achievement-admin/hooks/useUserBadges.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C1.
 *
 * ## What this hook owns
 *
 * - Fetch a user's earned badges through the admin service layer
 *   (`getUserBadges` — wraps the Phase 5 read).
 * - Validate the `userId` before any fetch fires.
 * - Expose `{ badges, isLoading, error, mutate }` for the admin user page.
 * - Feature-flag gating via `phase7_admin_achievement`.
 *
 * ## Validation gate
 *
 * When `validateUserId(userId)` fails, the hook is disabled (no fetch fires)
 * and returns safe fallback `{ badges: [], isLoading: false, error: null }`.
 * This prevents the admin surface from making invalid requests to the backend.
 *
 * ## SWR cache
 *
 * The cache key uses the `admin` namespace so it does not collide with
 * Phase 5 `ACHIEVEMENT_CACHE_KEYS.userBadges()`. The re-evaluate
 * (TKT-7.8.C4) and revoke (TKT-7.8.C5) hooks call `mutate()` on this key
 * to reflect the new state after a mutation.
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

import { getUserBadges } from '@/features/achievements/services/achievements.service';
import type { FeaturedBadgeResponseDto } from '@/lib/api/generated/schemas';

import { validateUserId } from '../validation';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserBadgesResult {
  /** Earned badges for the user. Empty when loading, errored, or disabled. */
  readonly badges: readonly FeaturedBadgeResponseDto[];
  /** True while the first fetch is in flight. */
  readonly isLoading: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Revalidate the badge list. */
  readonly mutate: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a user's earned badges for the achievement admin surface.
 *
 * Returns safe fallback when the flag is off or the id is invalid.
 */
export function useUserBadges(
  userId: string | null,
): UseUserBadgesResult {
  const flagValue = getFeatureFlagValue('phase7_admin_achievement');
  const isFlagPlaceholder = flagValue === 'placeholder';

  // Disabled sentinel when flag is off or id is invalid.
  const isDisabled = isFlagPlaceholder || userId === null || validateUserId(userId).ok === false;

  const key = useMemo(
    () =>
      isDisabled
        ? (['admin', 'achievement', 'user-badges', 'disabled'] as const)
        : (['admin', 'achievement', 'user-badges', userId] as const),
    [isDisabled, userId],
  );

  const fetcher = useCallback(async () => {
    if (isDisabled) return [] as Array<FeaturedBadgeResponseDto>;
    const profile = await getUserBadges(userId!);
    return (profile.featuredBadges ?? []) as Array<FeaturedBadgeResponseDto>;
  }, [isDisabled, userId]);

  const { data, error, isLoading, mutate } = useSWR<
    Array<FeaturedBadgeResponseDto>,
    ApiError
  >(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    badges: data ?? [],
    isLoading,
    error: error ?? null,
    mutate,
  };
}
