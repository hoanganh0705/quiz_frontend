/**
 * Badge Types — aligned with backend DTOs.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-A2.
 *
 * Re-exports generated DTOs and adds:
 * - `UserBadge` with `id` alias for cursor deduplication
 * - `UserBadgeList` wrapper type
 *
 * ## Deferred badges (master plan §1.3)
 *
 * The backend may return badges with `deferred: true` in the future.
 * Currently the generated DTO does not include this field.
 * When the backend adds support, this file will be updated to filter deferred badges.
 */

import type {
  MyBadgeItemDto,
  ListMyBadges200,
  ListMyBadges200AllOf,
} from "@/lib/api/generated/schemas";

// Re-export generated DTOs
export type { MyBadgeItemDto };

// ─── UserBadge ────────────────────────────────────────────────────────────────

/**
 * `MyBadgeItemDto` with a synthesised `id` field.
 *
 * The `id` field is an alias of `badgeId` so `appendUniqueById` deduplication
 * in `useCursorPaginated` works. Downstream components read `badgeId` directly.
 */
export type UserBadge = MyBadgeItemDto & { id: string };

/**
 * Earned badge type.
 * Note: When backend adds `deferred` field support, update filterEarnedBadges to exclude deferred badges.
 */
export type EarnedUserBadge = UserBadge;

// ─── UserBadgeList ────────────────────────────────────────────────────────────

/**
 * Normalized wrapper for the badge list response.
 * The service wrapper produces this type to normalize the bare array response.
 */
export interface UserBadgeList {
  items: EarnedUserBadge[];
  total: number;
}

/**
 * Wire envelope returned by `GET /users/me/badges` (post-unwrap).
 * The backend may return a bare array per master plan §1.3 warning line 61.
 */
export type ListMyBadgesResponse = ListMyBadges200 &
  ListMyBadges200AllOf & {
    data?: MyBadgeItemDto[];
  };

// ─── SWR key factory ───────────────────────────────────────────────────────────

export function myBadgesKey(): readonly ["users", "me", "badges"] {
  return ["users", "me", "badges"];
}

// ─── Badge filter ─────────────────────────────────────────────────────────────

/**
 * Filters badges for display.
 * Currently returns all badges; when backend adds `deferred` field support,
 * this function should be updated to filter out badges with `deferred: true`.
 */
export function filterEarnedBadges(badges: MyBadgeItemDto[]): EarnedUserBadge[] {
  return badges.map((badge) => ({
    ...badge,
    id: badge.badgeId,
  }));
}
