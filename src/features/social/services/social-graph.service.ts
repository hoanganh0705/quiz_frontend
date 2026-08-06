/**
 * `social-graph.service.ts` — Thin SDK pass-throughs for the social-graph
 * read endpoints.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.E2.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the eight social-graph read endpoints:
 *
 *   - `GET /users/:userId/followers`           — `getUserFollowers`
 *   - `GET /users/:userId/following`           — `getUserFollowing`
 *   - `GET /friends/:userId`                   — `getFriendsOfUser`
 *   - `GET /blocked`                           — `getBlockedUsers`
 *   - `GET /counts`                            — `getSocialCounts`
 *   - `GET /users/:userId/mutual-friends`      — `getMutualFriends`
 *   - `GET /users/:userId/mutual-followers`     — `getMutualFollowers`
 *   - `GET /users/:userId/activity`            — `getUserActivity`
 *
 * Consumed by Stories 6.2, 6.4, 6.7. The service is the only module in
 * the social feature that talks to the SDK's social graph controllers
 * directly — every downstream consumer (hooks, components) imports
 * through this module.
 *
 * ## Pattern
 *
 * Follows the Phase 5 service-wrapper convention
 * (`instances.service.ts`, `tournaments.service.ts`,
 * `notifications.service.ts`):
 *
 *   - Pure forwarders — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the read hooks so a
 *     disabled surface does not even fire a request.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `phase6:6.1` Sentry breadcrumb per call (via the helpers in
 *     `@/lib/social/phase6_sentry`).
 *   - Paginated endpoints return a normalized `SocialPage<T>` — the
 *     `{ data, meta }` envelope never reaches callers. The
 *     `paginationKind: 'offset'` discriminator is preserved so
 *     `useCursorPaginated` (which already accepts the offset variant)
 *     can read it without a per-call widening.
 *   - The `getUserActivity` payload is filtered for unknown
 *     `type` values via the existing `normalizeSocialFeedItemPayload`
 *     adapter, so the caller receives only items with a known
 *     payload variant.
 *
 * ## Internal-id leakage defence
 *
 * The `followId` / `friendshipId` fields on the wire shapes are
 * propagated through the existing DTO adapters
 * (`toSocialUserSummaryFromFollowRow`, `toFriendRequest`, etc.), which
 * strip them before the projection is returned. The application
 * therefore never sees internal ids.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetBlockedUsersResult,
  SocialControllerGetFriendsOfUserResult,
  SocialControllerGetMutualFollowersResult,
  SocialControllerGetMutualFriendsResult,
  SocialControllerGetSocialCountsResult,
  SocialControllerGetUserActivityResult,
  SocialControllerGetUserFollowersResult,
  SocialControllerGetUserFollowingResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/phase6_sentry";

import {
  normalizeSocialPage,
  toActivityItem,
  toMutual,
  toSocialCounts,
  toSocialUserSummaryFromFollowRow,
  toSocialUserSummaryFromFriendRow,
  toBlockedUser,
} from "@/features/social/dto-adapters";
import type {
  SocialActivityItemDto,
  SocialCountsDto,
  SocialMutualDto,
  SocialPage,
  SocialUserSummaryDto,
  SocialBlockedUserDto,
} from "@/features/social/types";

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert the activity payload rows into the canonical projection,
 * dropping items whose `type` discriminator is unknown to the
 * frontend. The wire rows are flat — only `id`, `type`, `occurredAt`,
 * `payload` are emitted. The projection's `actorUser` is a placeholder
 * because the per-user activity endpoint never surfaces the actor.
 */
function projectActivityPage(
  envelope: SocialControllerGetUserActivityResult,
): SocialPage<SocialActivityItemDto> {
  const rows = envelope?.data ?? [];
  const items: SocialActivityItemDto[] = [];
  for (const row of rows) {
    const projected = toActivityItem(row);
    if (projected !== null) items.push(projected);
  }
  const raw = normalizeSocialPage<SocialActivityItemDto>(envelope);
  // Rebuild the page with the filtered items — the metadata
  // (paginationKind, cursor / offset) is preserved as-is.
  return {
    items,
    ...(raw.paginationKind === "cursor"
      ? {
          paginationKind: "cursor" as const,
          nextCursor: raw.nextCursor,
          limit: raw.limit,
        }
      : {
          paginationKind: "offset" as const,
          total: raw.total,
          offset: raw.offset,
          limit: raw.limit,
        }),
  };
}

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope is
 * missing entirely. Mirrors the convention established by
 * `instances.service.ts` (TKT-5.1.F2).
 */
function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
  if (wire === null || wire === undefined) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return wire;
}

// ─── Followers / Following ───────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/followers`
 *
 * Cursor-paginated list of the target user's followers. Returns a
 * normalized `SocialPage<SocialUserSummaryDto>` with the
 * `paginationKind: 'offset'` discriminator preserved (the SDK returns
 * `PaginationMetaDto` for this endpoint which the adapter treats as
 * the offset variant).
 */
export async function getUserFollowers(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialPage<SocialUserSummaryDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getUserFollowers",
    targetUserId: userId,
  });
  const wire: SocialControllerGetUserFollowersResult =
    await getSocial().socialControllerGetUserFollowers(userId, params);
  const envelope = requireEnvelope(
    wire,
    "Get user followers response missing envelope",
  );
  const page = normalizeSocialPage<SocialUserSummaryDto>(envelope);
  return {
    ...page,
    items: page.items.map((row) => toSocialUserSummaryFromFollowRow(row)),
  };
}

/**
 * `GET /api/v1/social/users/:userId/following`
 *
 * Cursor-paginated list of the users the target user follows.
 */
export async function getUserFollowing(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialPage<SocialUserSummaryDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getUserFollowing",
    targetUserId: userId,
  });
  const wire: SocialControllerGetUserFollowingResult =
    await getSocial().socialControllerGetUserFollowing(userId, params);
  const envelope = requireEnvelope(
    wire,
    "Get user following response missing envelope",
  );
  const page = normalizeSocialPage<SocialUserSummaryDto>(envelope);
  return {
    ...page,
    items: page.items.map((row) => toSocialUserSummaryFromFollowRow(row)),
  };
}

// ─── Friends ─────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/friends/:userId`
 *
 * Cursor-paginated list of the target user's friends. The SDK
 * requires `limit` and `cursor` to be supplied; the read hook
 * supplies them on every call.
 */
export async function getFriendsOfUser(
  userId: string,
  params: { limit: number; cursor: string | null },
): Promise<SocialPage<SocialUserSummaryDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getFriendsOfUser",
    targetUserId: userId,
  });
  const wire: SocialControllerGetFriendsOfUserResult =
    await getSocial().socialControllerGetFriendsOfUser(userId, {
      limit: params.limit,
      cursor: params.cursor ?? "",
    });
  const envelope = requireEnvelope(
    wire,
    "Get friends of user response missing envelope",
  );
  const page = normalizeSocialPage<SocialUserSummaryDto>(envelope);
  return {
    ...page,
    items: page.items.map((row) => toSocialUserSummaryFromFriendRow(row)),
  };
}

// ─── Blocked users (viewer-only) ────────────────────────────────────────

/**
 * `GET /api/v1/social/blocked`
 *
 * Returns the viewer's blocked-users list. The endpoint is
 * viewer-only — the target user id is implicit (the JWT subject).
 * The service synthesizes a cursor-paginated single-page response
 * (the SDK returns a flat `WrappedDto` for non-paginated endpoints)
 * so the read hook can consume it via the same `useCursorPaginated`
 * primitive as the other lists.
 */
export async function getBlockedUsers(): Promise<
  SocialPage<SocialBlockedUserDto>
> {
  addSocialServiceBreadcrumb({
    route: "social.getBlockedUsers",
  });
  const wire: SocialControllerGetBlockedUsersResult =
    await getSocial().socialControllerGetBlockedUsers();
  const envelope = requireEnvelope(
    wire,
    "Get blocked users response missing envelope",
  );
  const rows = (envelope?.data ?? []) as readonly unknown[];
  const items: SocialBlockedUserDto[] = rows.map((row) => toBlockedUser(row));
  const limit = items.length;
  return Object.freeze({
    items,
    paginationKind: "cursor" as const,
    nextCursor: null,
    limit,
  });
}

// ─── Social counts (viewer-only) ─────────────────────────────────────────

/**
 * `GET /api/v1/social/counts`
 *
 * Returns the viewer's aggregated social counters (followers,
 * following, friends). The endpoint is viewer-only.
 */
export async function getSocialCounts(): Promise<SocialCountsDto> {
  addSocialServiceBreadcrumb({
    route: "social.getSocialCounts",
  });
  const wire: SocialControllerGetSocialCountsResult =
    await getSocial().socialControllerGetSocialCounts();
  const envelope = requireEnvelope(
    wire,
    "Get social counts response missing envelope",
  );
  return toSocialCounts(envelope?.data);
}

// ─── Mutual friends / mutual followers ───────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/mutual-friends`
 *
 * Cursor-paginated list of friends shared between the viewer and the
 * target user. Each row is projected into a `SocialMutualDto` (the
 * adapter joins the wire flat row into a nested `user` summary).
 */
export async function getMutualFriends(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialPage<SocialMutualDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getMutualFriends",
    targetUserId: userId,
  });
  const wire: SocialControllerGetMutualFriendsResult =
    await getSocial().socialControllerGetMutualFriends(userId, params);
  const envelope = requireEnvelope(
    wire,
    "Get mutual friends response missing envelope",
  );
  const page = normalizeSocialPage<SocialMutualDto>(envelope);
  return {
    ...page,
    items: page.items.map((row) => toMutual(row)),
  };
}

/**
 * `GET /api/v1/social/users/:userId/mutual-followers`
 *
 * Cursor-paginated list of followers shared between the viewer and the
 * target user. The wire shape is structurally identical to the
 * mutual-friends row, so the same `toMutual` adapter is used.
 */
export async function getMutualFollowers(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialPage<SocialMutualDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getMutualFollowers",
    targetUserId: userId,
  });
  const wire: SocialControllerGetMutualFollowersResult =
    await getSocial().socialControllerGetMutualFollowers(userId, params);
  const envelope = requireEnvelope(
    wire,
    "Get mutual followers response missing envelope",
  );
  const page = normalizeSocialPage<SocialMutualDto>(envelope);
  return {
    ...page,
    items: page.items.map((row) => toMutual(row)),
  };
}

// ─── User activity ───────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/activity`
 *
 * Cursor-paginated list of public activity events for the target
 * user. Items with unknown `type` discriminators are dropped by
 * `toActivityItem` so the read hook always receives a clean array
 * of canonical `SocialActivityItemDto` projections.
 */
export async function getUserActivity(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<SocialPage<SocialActivityItemDto>> {
  addSocialServiceBreadcrumb({
    route: "social.getUserActivity",
    targetUserId: userId,
  });
  const wire: SocialControllerGetUserActivityResult =
    await getSocial().socialControllerGetUserActivity(userId, params);
  const envelope = requireEnvelope(
    wire,
    "Get user activity response missing envelope",
  );
  return projectActivityPage(envelope);
}
