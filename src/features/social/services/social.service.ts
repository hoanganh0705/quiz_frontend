/**
 * `social.service.ts` — Thin SDK pass-throughs for the social REST
 * surface.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.E1 (Batch E — minimal subset authored with
 *                Batch C and Batch D to satisfy the dependency edges
 *                declared in the ticket plan).
 *
 * ## Purpose
 *
 * Single source of truth for the read-side HTTP calls against
 * `/api/v1/social/*`. Every Batch-D hook (`useRelationship`,
 * `useFollowers`, `useFollowing`, `useFriends`, `useBlockedUsers`,
 * `useSocialCounts`, `useIncomingRequests`, `useOutgoingRequests`)
 * imports through this module — never from `@/lib/api` directly.
 *
 * ## Pattern
 *
 * Follows the Phase 5 service-wrapper convention
 * (`instances.service.ts`, `tournaments.service.ts`):
 *
 *   - Pure forwarders — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the read hooks
 *     (Batch D) so a disabled surface does not even fire a request.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code` and feed the typed code into `getUserCopy`.
 *   - One `social:6.1` Sentry breadcrumb per call (via the helpers in
 *     `@/lib/social/social-sentry`).
 *   - If the SDK response is missing `data` (malformed envelope),
 *     throw a `GLOBAL_INTERNAL_ERROR` so the caller does not have to
 *     handle a `T | undefined` payload.
 *
 * ## Why this file ships with Batch C/D
 *
 * The Batch-D hooks have a strict dependency on TKT-6.1.E1. Shipping
 * the Batch-D hooks without their service layer would leave the read
 * hooks importing functions that do not exist yet — a compile error
 * that would block the Batch C/D commits. The Batch-E mutation
 * wrappers and the search/discovery/feed/analytics services will be
 * added by their respective batches; this file currently exposes the
 * 8 read-only endpoints Batch D consumes.
 *
 * ## Paginated endpoints
 *
 * For paginated endpoints, the wrapper returns the full
 * `{ data, meta }` envelope so the read hook can extract both the
 * rows AND the pagination metadata. The `requireData` helper only
 * guards against the entirely-missing envelope (the SDK may encode
 * `data` as optional `undefined` for transport-level reasons).
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetBlockedUsersResult,
  SocialControllerGetFriendLeaderboardResult,
  SocialControllerGetFriendsOfUserResult,
  SocialControllerGetMySocialAnalyticsResult,
  SocialControllerGetPendingRequestsResult,
  SocialControllerGetRelationshipStatusResult,
  SocialControllerGetSentRequestsResult,
  SocialControllerGetSocialCountsResult,
  SocialControllerGetUserFollowersResult,
  SocialControllerGetUserFollowingResult,
  SocialControllerGetUserSocialStatsResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope is
 * missing entirely. Mirrors the convention established by
 * `instances.service.ts` (TKT-5.1.F2).
 */
function requireEnvelope<T>(
  wire: T | null | undefined,
  message: string,
): T {
  if (wire === null || wire === undefined) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return wire;
}

// ─── Relationship status ─────────────────────────────────────────────────

/**
 * `GET /api/v1/social/relationship/:userId`
 *
 * Returns the relationship status between the viewer and the target
 * user. The response is the SDK `RelationshipStatusDto` (boolean
 * flags) — the adapter layer (`dto-adapters.ts`,
 * `stripRelationshipInternalIds`) collapses it into the canonical
 * `Relationship` projection.
 */
export async function getRelationshipStatus(
  userId: string,
): Promise<SocialControllerGetRelationshipStatusResult> {
  addSocialServiceBreadcrumb({
    route: "social.getRelationshipStatus",
    targetUserId: userId,
  });
  const wire = await getSocial().socialControllerGetRelationshipStatus(userId);
  return requireEnvelope(
    wire,
    "Get relationship status response missing envelope",
  );
}

// ─── Followers / Following ───────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/followers`
 *
 * Cursor-paginated list of the target user's followers. The SDK
 * accepts an optional `limit` (default server-side) and `cursor`
 * (null on the first page).
 */
export async function getUserFollowers(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialControllerGetUserFollowersResult> {
  addSocialServiceBreadcrumb({
    route: "social.getUserFollowers",
    targetUserId: userId,
  });
  const wire = await getSocial().socialControllerGetUserFollowers(
    userId,
    params,
  );
  return requireEnvelope(wire, "Get user followers response missing envelope");
}

/**
 * `GET /api/v1/social/users/:userId/following`
 *
 * Cursor-paginated list of the users the target user follows.
 */
export async function getUserFollowing(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialControllerGetUserFollowingResult> {
  addSocialServiceBreadcrumb({
    route: "social.getUserFollowing",
    targetUserId: userId,
  });
  const wire = await getSocial().socialControllerGetUserFollowing(
    userId,
    params,
  );
  return requireEnvelope(wire, "Get user following response missing envelope");
}

// ─── Friends ─────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/friends`
 *
 * Cursor-paginated list of the target user's friends. The SDK
 * requires `limit` and `cursor` to be supplied; the read hook
 * supplies them on every call.
 */
export async function getFriendsOfUser(
  userId: string,
  params: { limit: number; cursor: string | null },
): Promise<SocialControllerGetFriendsOfUserResult> {
  addSocialServiceBreadcrumb({
    route: "social.getFriendsOfUser",
    targetUserId: userId,
  });
  const wire = await getSocial().socialControllerGetFriendsOfUser(userId, {
    limit: params.limit,
    cursor: params.cursor ?? "",
  });
  return requireEnvelope(wire, "Get friends of user response missing envelope");
}

// ─── Blocked users (viewer-only) ────────────────────────────────────────

/**
 * `GET /api/v1/social/blocked`
 *
 * Returns the viewer's blocked-users list. The endpoint is
 * viewer-only — the target user id is implicit (the JWT subject).
 */
export async function getBlockedUsers(): Promise<
  SocialControllerGetBlockedUsersResult
> {
  addSocialServiceBreadcrumb({
    route: "social.getBlockedUsers",
  });
  const wire = await getSocial().socialControllerGetBlockedUsers();
  return requireEnvelope(wire, "Get blocked users response missing envelope");
}

// ─── Social counts (viewer-only) ─────────────────────────────────────────

/**
 * `GET /api/v1/social/counts`
 *
 * Returns the viewer's aggregated social counters (followers,
 * following, friends). The endpoint is viewer-only.
 */
export async function getSocialCounts(): Promise<
  SocialControllerGetSocialCountsResult
> {
  addSocialServiceBreadcrumb({
    route: "social.getSocialCounts",
  });
  const wire = await getSocial().socialControllerGetSocialCounts();
  return requireEnvelope(wire, "Get social counts response missing envelope");
}

// ─── Friend requests (viewer-only) ───────────────────────────────────────

/**
 * `GET /api/v1/social/friend-requests/incoming`
 *
 * Returns the viewer's incoming (pending) friend requests. The
 * endpoint is viewer-only.
 */
export async function getPendingRequests(): Promise<
  SocialControllerGetPendingRequestsResult
> {
  addSocialServiceBreadcrumb({
    route: "social.getPendingRequests",
  });
  const wire = await getSocial().socialControllerGetPendingRequests();
  return requireEnvelope(wire, "Get pending requests response missing envelope");
}

/**
 * `GET /api/v1/social/friend-requests/sent`
 *
 * Returns the viewer's outgoing (sent) friend requests. The endpoint
 * is viewer-only.
 */
export async function getSentRequests(): Promise<
  SocialControllerGetSentRequestsResult
> {
  addSocialServiceBreadcrumb({
    route: "social.getSentRequests",
  });
  const wire = await getSocial().socialControllerGetSentRequests();
  return requireEnvelope(wire, "Get sent requests response missing envelope");
}

// ─── Story 6.3 analytics service wrappers ────────────────────────────────
//
// These three wrappers land with the Story 6.3 Batch D hooks
// (TKT-6.3.D1 / D2 / D3) to satisfy the dependency edges declared
// in the ticket plan. They follow the same pattern as the read
// wrappers above (Sentry breadcrumb, envelope guard, no cache
// mutations) so the consumer hooks in `hooks/useUserSocialStats.ts`,
// `hooks/useMySocialAnalytics.ts`, and `hooks/useFriendLeaderboard.ts`
// can import a single source of truth.

/**
 * `GET /api/v1/social/users/:userId/stats`
 *
 * Returns the per-user social stats. The endpoint is public
 * (anyone can read another user's public stats) but the privacy
 * guard (privacy notices for blocked users, private profiles) is
 * applied in the `useUserSocialStats` hook.
 */
export async function getUserSocialStats(
  userId: string,
): Promise<SocialControllerGetUserSocialStatsResult> {
  addSocialServiceBreadcrumb({
    route: "social.getUserSocialStats",
    targetUserId: userId,
  });
  const wire = await getSocial().socialControllerGetUserSocialStats(userId);
  return requireEnvelope(
    wire,
    "Get user social stats response missing envelope",
  );
}

/**
 * `GET /api/v1/social/me/analytics`
 *
 * Returns the viewer's deep social analytics. The endpoint is
 * viewer-only.
 */
export async function getMySocialAnalytics(): Promise<
  SocialControllerGetMySocialAnalyticsResult
> {
  addSocialServiceBreadcrumb({
    route: "social.getMySocialAnalytics",
  });
  const wire = await getSocial().socialControllerGetMySocialAnalytics();
  return requireEnvelope(
    wire,
    "Get my social analytics response missing envelope",
  );
}

/**
 * `GET /api/v1/social/friends/leaderboard`
 *
 * Returns the friend leaderboard for the requested period. The
 * `period` parameter accepts the documented values
 * `'weekly' | 'monthly' | 'all_time'`; the consumer hook
 * `useFriendLeaderboard` accepts the analytics period
 * `'week' | 'month' | 'all'` and maps it to the SDK shape.
 */
export async function getFriendLeaderboard(params: {
  period: "weekly" | "monthly" | "all_time";
  limit: number;
}): Promise<SocialControllerGetFriendLeaderboardResult> {
  addSocialServiceBreadcrumb({
    route: "social.getFriendLeaderboard",
  });
  const wire = await getSocial().socialControllerGetFriendLeaderboard({
    period: params.period,
    limit: params.limit,
  });
  return requireEnvelope(
    wire,
    "Get friend leaderboard response missing envelope",
  );
}
