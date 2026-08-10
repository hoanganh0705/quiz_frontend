/**
 * `features/admin/achievement-admin/cache-keys.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.G1.
 *
 * ## Purpose
 *
 * Single source of truth for all SWR cache keys used by achievement admin hooks.
 * This module exports typed key factories so the key shape is defined in one place
 * and consumed by C1, C2, C4, C5 without duplication.
 *
 * ## Key conventions
 *
 * All keys use the `'admin', 'achievement'` namespace to avoid collisions
 * with Phase 5 public achievement keys. The userId is always part of the key
 * since these caches are scoped to a single user.
 *
 * Keys:
 *   - User badges:   `['admin', 'achievement', 'user-badges', userId]`
 *   - User history: `['admin', 'achievement', 'user-history', userId]`
 *
 * ## Invalidation
 *
 * `invalidateAchievementAdmin(userId)` invalidates both keys for a given user.
 * Called by `useReevaluateUserAchievements` and `useRevokeUserBadge` on success.
 */

import { mutate as globalMutate } from 'swr';

// ─── Key factories ────────────────────────────────────────────────────────

/**
 * SWR cache key for a user's earned badges (achievement admin surface).
 *
 * Matches the key used by `useUserBadges` (TKT-7.8.C1).
 */
export function userBadgesKey(userId: string): readonly ['admin', 'achievement', 'user-badges', string] {
  return ['admin', 'achievement', 'user-badges', userId] as const;
}

/**
 * SWR cache key for a user's achievement history (achievement admin surface).
 *
 * Matches the key used by `useUserAchievementHistory` (TKT-7.8.C2).
 * When paginated, the page index is appended: `['admin', 'achievement', 'user-history', userId, page]`.
 *
 * @param userId - the user id
 * @param pageIndex - the page index (0-indexed offset pagination)
 */
export function userHistoryKey(
  userId: string,
  pageIndex = 0,
): readonly ['admin', 'achievement', 'user-history', string, number] {
  return ['admin', 'achievement', 'user-history', userId, pageIndex] as const;
}

// ─── Invalidation helper ─────────────────────────────────────────────────

/**
 * Invalidate all achievement admin SWR caches for a given user.
 *
 * Called by mutation hooks on success to ensure the badge list and history
 * reflect the latest server state.
 *
 * @param userId - the user whose caches to invalidate
 * @param mutateFn - the SWR mutate function (defaults to global mutate)
 */
export async function invalidateAchievementAdmin(
  userId: string,
  mutateFn: typeof globalMutate = globalMutate,
): Promise<void> {
  // Invalidate user badges cache
  await mutateFn(userBadgesKey(userId));

  // Invalidate all history pages for this user.
  // Since we don't know how many pages exist, we invalidate by pattern.
  // The `mutate` API accepts a key matcher function.
  await mutateFn((key: unknown) => {
    if (!Array.isArray(key)) return false;
    return (
      key.length >= 4 &&
      key[0] === 'admin' &&
      key[1] === 'achievement' &&
      key[2] === 'user-history' &&
      key[3] === userId
    );
  });
}
