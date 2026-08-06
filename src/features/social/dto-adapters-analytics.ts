/**
 * `dto-adapters-analytics.ts` — DTO projections for the Story 6.3
 * analytics hooks.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.D1 → D3 (the three hooks consume the three
 *                adapters below).
 *
 * ## Purpose
 *
 * The single source of truth for the **wire-DTO → frontend-DTO**
 * projections the analytics hooks consume. The projections:
 *
 *   - Strip leaked internal ids (the three wire DTOs do not leak
 *     ids today, but the adapter layer is the documented seam for
 *     that future drift).
 *   - Normalise optional fields with stable defaults.
 *   - Carry the freshness envelope (`staleAt` / `isStale`) so the
 *     `useEventuallyConsistentQuery` primitive (TKT-6.3.D4) can
 *     derive `staleness` without re-reading the raw wire DTO.
 *
 * ## Why a separate file (not the existing `dto-adapters.ts`)
 *
 * The existing `dto-adapters.ts` (TKT-6.1.C2) is the projection
 * layer for the Epic 6.1 read hooks. Adding the three analytics
 * adapters there would couple Epic 6.1's adapter list to a new
 * epic's naming convention. The standalone file keeps the analytics
 * surface in its own slice, mirroring the type-level split in
 * `types/analytics.ts` (TKT-6.3.A3).
 *
 * ## Consumer pattern
 *
 * ```ts
 * const envelope = await getUserSocialStats(userId);
 * const dto = toSocialUserStats(envelope?.data);
 * ```
 */

import type {
  SocialControllerGetFriendLeaderboardResult,
  SocialControllerGetMySocialAnalyticsResult,
  SocialControllerGetUserSocialStatsResult,
} from "@/lib/api/generated/social/social";

import type {
  FriendLeaderboardDto,
  FriendLeaderboardEntryDto,
  SocialMyAnalyticsDto,
  SocialUserStatsDto,
} from "@/features/social/types/analytics";

/**
 * Project a wire `UserSocialStatsResponseDto` to the canonical
 * `SocialUserStatsDto`. Returns the zeroed projection when the
 * payload is missing so the consumer never branches on
 * `T | undefined`.
 */
export function toSocialUserStats(
  input: unknown,
): SocialUserStatsDto {
  const wire = (input ?? {}) as {
    friends?: unknown;
    followers?: unknown;
    following?: unknown;
    staleAt?: unknown;
    isStale?: unknown;
  };
  return {
    friends: typeof wire.friends === "number" ? wire.friends : 0,
    followers: typeof wire.followers === "number" ? wire.followers : 0,
    following: typeof wire.following === "number" ? wire.following : 0,
    ...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
    ...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

/**
 * Convenience: project the SDK envelope shape directly. The hook
 * uses this to avoid repeating the `envelope?.data ?? null` pattern.
 */
export function toSocialUserStatsFromEnvelope(
  envelope: SocialControllerGetUserSocialStatsResult,
): SocialUserStatsDto {
  return toSocialUserStats(envelope?.data);
}

/**
 * Project a wire `MySocialAnalyticsResponseDto` to the canonical
 * `SocialMyAnalyticsDto`.
 */
export function toSocialMyAnalytics(input: unknown): SocialMyAnalyticsDto {
  const wire = (input ?? {}) as {
    friends?: unknown;
    followers?: unknown;
    following?: unknown;
    growth30Days?: unknown;
    staleAt?: unknown;
    isStale?: unknown;
  };
  return {
    friends: typeof wire.friends === "number" ? wire.friends : 0,
    followers: typeof wire.followers === "number" ? wire.followers : 0,
    following: typeof wire.following === "number" ? wire.following : 0,
    growth30Days:
      typeof wire.growth30Days === "number" ? wire.growth30Days : 0,
    ...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
    ...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

export function toSocialMyAnalyticsFromEnvelope(
  envelope: SocialControllerGetMySocialAnalyticsResult,
): SocialMyAnalyticsDto {
  return toSocialMyAnalytics(envelope?.data);
}

/**
 * Project a wire `FriendRankingEntryDto` to the canonical
 * `FriendLeaderboardEntryDto`. The projection is intentionally
 * 1:1 today (no internal ids to strip); the function exists so
 * future wire-DTO drift has a documented seam.
 */
export function toFriendLeaderboardEntry(
  input: unknown,
): FriendLeaderboardEntryDto {
  const wire = (input ?? {}) as {
    rank?: unknown;
    userId?: unknown;
    username?: unknown;
    displayName?: unknown;
    avatarUrl?: unknown;
    xp?: unknown;
    friendSince?: unknown;
  };
  return {
    rank: typeof wire.rank === "number" ? wire.rank : 0,
    userId: typeof wire.userId === "string" ? wire.userId : "",
    username: typeof wire.username === "string" ? wire.username : "",
    displayName:
      typeof wire.displayName === "string" ? wire.displayName : null,
    avatarUrl: typeof wire.avatarUrl === "string" ? wire.avatarUrl : null,
    xp: typeof wire.xp === "number" ? wire.xp : 0,
    friendSince:
      typeof wire.friendSince === "string" ? wire.friendSince : "",
  };
}

/**
 * Project a wire `FriendLeaderboardDto` to the canonical
 * `FriendLeaderboardDto` (frontend projection).
 */
export function toFriendLeaderboard(
  input: unknown,
): FriendLeaderboardDto {
  const wire = (input ?? {}) as {
    period?: unknown;
    entries?: unknown;
    currentUserRank?: unknown;
    totalParticipants?: unknown;
    staleAt?: unknown;
    isStale?: unknown;
  };
  const period =
    wire.period === "weekly" ||
    wire.period === "monthly" ||
    wire.period === "all_time"
      ? wire.period
      : "weekly";
  const entries = Array.isArray(wire.entries)
    ? wire.entries.map((e) => toFriendLeaderboardEntry(e))
    : [];
  const rawRank = wire.currentUserRank as
    | { rank?: unknown; xp?: unknown }
    | null
    | undefined;
  const currentUserRank =
    rawRank !== null &&
    rawRank !== undefined &&
    typeof rawRank === "object" &&
    typeof rawRank.rank === "number" &&
    typeof rawRank.xp === "number"
      ? { rank: rawRank.rank, xp: rawRank.xp }
      : null;
  return {
    period,
    entries,
    currentUserRank,
    totalParticipants:
      typeof wire.totalParticipants === "number"
        ? wire.totalParticipants
        : 0,
    ...(typeof wire.staleAt === "string" ? { staleAt: wire.staleAt } : {}),
    ...(typeof wire.isStale === "boolean" ? { isStale: wire.isStale } : {}),
  };
}

export function toFriendLeaderboardFromEnvelope(
  envelope: SocialControllerGetFriendLeaderboardResult,
): FriendLeaderboardDto {
  return toFriendLeaderboard(envelope?.data);
}