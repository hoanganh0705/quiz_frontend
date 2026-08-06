/**
 * `follow-mutation.service.ts` — Thin SDK pass-throughs for the follow /
 * unfollow mutation endpoints and the stats-refresh endpoint.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for:
 *
 *   - `POST /api/v1/social/follow/:userId`  — `followUser`
 *   - `DELETE /api/v1/social/follow/:userId` — `unfollowUser`
 *   - `GET  /api/v1/social/users/:userId/stats` — `refreshSocialStats`
 *
 * Consumed by `useFollow` (TKT-6.6.D1) and `useUnfollow` (TKT-6.6.D2).
 *
 * ## Pattern
 *
 * Follows the Phase 5 / 6 service-wrapper convention
 * (`relationship.service.ts`, `social-graph.service.ts`):
 *
 *   - Pure forwarder — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the mutation hooks.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `phase6:6.6` Sentry breadcrumb per follow/unfollow call
 *     (via `addFollowMutationBreadcrumb` in `phase6_6_6_sentry.ts`);
 *     `refreshSocialStats` uses the generic Epic 6.1 helper.
 *   - The `followId` / `friendshipId` internal ids are never surfaced:
 *     `followUser` and `unfollowUser` return `void` on success (the SDK
 *     emits 204 No Content); `refreshSocialStats` returns a
 *     `SocialUserStatsDto` projection that contains only public counts.
 *
 * ## Non-idempotent DELETE behaviour
 *
 * `unfollowUser` calls `DELETE /social/follow/:userId`. The backend
 * returns `404 + code: 'SOCIAL_FOLLOW_NOT_FOUND'` when the viewer is
 * not currently following the target. The service maps this to an
 * `ApiError` so the caller (`useUnfollow`) can distinguish
 * "already unfollowed" (terminal success) from a genuine error.
 *
 * ## Internal-id leakage defence
 *
 * The follow / unfollow endpoints return 204 No Content. The stats
 * endpoint (`UserSocialStatsResponseDto`) contains only public counts
 * (`friends`, `followers`, `following`). Neither response carries
 * `followId` or `friendshipId`. The service therefore cannot
 * inadvertently surface them.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful follow / unfollow, callers revalidate the
 * relationship and counts keys via `mutateCarefully`. When Epic 6.10
 * lands, the Phase 5 `/notifications` socket will emit
 * `relationship.changed` events that trigger the same invalidation.
 * See TKT-6.6.G3 for the integration documentation.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetUserSocialStatsResult,
} from "@/lib/api/generated/social/social";

import {
  addFollowMutationBreadcrumb,
  SOCIAL_6_6_ROUTES,
} from "@/lib/social/phase6_6_6_sentry";

import { addSocialServiceBreadcrumb } from "@/lib/social/phase6_sentry";

import type { SocialUserStatsDto } from "@/features/social/types";

/**
 * Measured-call helper. Wraps an async SDK call with timing and
 * breadcrumbs. Reusable across follow / unfollow / stats.
 */
async function measuredCall<T>(args: {
  action: string;
  targetUserId: string;
  method: "POST" | "DELETE" | "GET";
  route: string;
  call: () => Promise<T>;
}): Promise<T> {
  const start = performance.now();
  try {
    const result = await args.call();
    const durationMs = performance.now() - start;
    // follow / unfollow use the Epic 6.6 helpers; stats uses the Epic 6.1 generic helpers.
    if (args.method === "POST" || args.method === "DELETE") {
      addFollowMutationBreadcrumb({
        route: SOCIAL_6_6_ROUTES[args.route as keyof typeof SOCIAL_6_6_ROUTES] ?? args.route,
        method: args.method,
        status: 200,
        durationMs,
        targetUserId: args.targetUserId,
      });
    } else {
      addSocialServiceBreadcrumb({
        route: args.route,
        status: 200,
        durationMs,
        targetUserId: args.targetUserId,
      });
    }
    return result;
  } catch (err) {
    const durationMs = performance.now() - start;
    if (err instanceof ApiError) {
      if (args.method === "POST" || args.method === "DELETE") {
        addFollowMutationBreadcrumb({
          route: SOCIAL_6_6_ROUTES[args.route as keyof typeof SOCIAL_6_6_ROUTES] ?? args.route,
          method: args.method,
          status: err.status,
          durationMs,
          code: err.code,
          targetUserId: args.targetUserId,
        });
      } else {
        // Stats: use the generic Epic 6.1 helper.
        void addSocialServiceBreadcrumb({
          route: args.route,
          status: err.status,
          durationMs,
          code: err.code,
          targetUserId: args.targetUserId,
        });
      }
    } else {
      // Network error (non-HTTP).
      if (args.method === "POST" || args.method === "DELETE") {
        addFollowMutationBreadcrumb({
          route: SOCIAL_6_6_ROUTES[args.route as keyof typeof SOCIAL_6_6_ROUTES] ?? args.route,
          method: args.method,
          status: undefined,
          durationMs,
          targetUserId: args.targetUserId,
        });
      }
    }
    throw err;
  }
}

// ─── Follow / Unfollow mutations ──────────────────────────────────────────

/**
 * `POST /api/v1/social/follow/:userId`
 *
 * Follow a user. The backend returns 204 No Content on success.
 *
 * Error codes surfaced:
 *   - `SOCIAL_ALREADY_FOLLOWING`   — viewer is already following
 *   - `SOCIAL_SELF_FOLLOW`         — cannot follow yourself
 *   - `SOCIAL_USER_BLOCKED`        — blocked by the target
 *   - `SOCIAL_BLOCKED_USER`        — you have blocked the target
 *   - `GLOBAL_UNAUTHENTICATED`     — not signed in
 *   - `GLOBAL_RATE_LIMITED`        — too many requests
 *   - `GLOBAL_INTERNAL_ERROR`      — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers branch on `apiError.code`.
 */
export async function followUser(userId: string): Promise<void> {
  await measuredCall({
    action: "follow",
    targetUserId: userId,
    method: "POST",
    route: "social.followUser",
    call: async () => {
      void await getSocial().socialControllerFollowUser(userId);
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}

/**
 * `DELETE /api/v1/social/follow/:userId`
 *
 * Unfollow a user. The backend returns 204 No Content on success.
 *
 * Error codes surfaced:
 *   - `SOCIAL_FOLLOW_NOT_FOUND`     — not currently following (non-idempotent
 *                                    DELETE → treated as terminal success by
 *                                    the caller, NOT as an error banner)
 *   - `GLOBAL_UNAUTHENTICATED`     — not signed in
 *   - `GLOBAL_RATE_LIMITED`        — too many requests
 *   - `GLOBAL_INTERNAL_ERROR`       — unexpected server error
 *
 * @param userId The target user's stable identifier.
 * @returns Resolves on success (void — 204 No Content).
 * @throws ApiError on failure. Callers distinguish
 *         `SOCIAL_FOLLOW_NOT_FOUND` (terminal state) from genuine errors.
 */
export async function unfollowUser(userId: string): Promise<void> {
  await measuredCall({
    action: "unfollow",
    targetUserId: userId,
    method: "DELETE",
    route: "social.unfollowUser",
    call: async () => {
      void await getSocial().socialControllerUnfollowUser(userId);
      // 204 No Content — nothing to project.
      return undefined as void;
    },
  });
}

// ─── Stats refresh ─────────────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/:userId/stats`
 *
 * Returns the public follower / following / friend counts for a user.
 * Used by the counts badge after a follow / unfollow mutation to
 * revalidate the authoritative numbers without a full-page reload.
 *
 * The endpoint is public (reachable for any user with a public profile).
 * The projection (`SocialUserStatsDto`) contains only the three counts.
 *
 * @param userId The target user's stable identifier.
 * @returns The normalised public stats projection.
 * @throws ApiError on failure.
 */
export async function refreshSocialStats(
  userId: string,
): Promise<SocialUserStatsDto> {
  return measuredCall({
    action: "refreshSocialStats",
    targetUserId: userId,
    method: "GET",
    route: "social.getUserSocialStats",
    call: async () => {
      const wire: SocialControllerGetUserSocialStatsResult =
        await getSocial().socialControllerGetUserSocialStats(userId);
      const envelope = wire?.data;
      if (envelope === null || envelope === undefined) {
        throw new ApiError({
          status: 500,
          code: "GLOBAL_INTERNAL_ERROR",
          message: "Get user social stats response missing envelope",
        } as unknown as ConstructorParameters<typeof ApiError>[0]);
      }
      // `UserSocialStatsResponseDto` fields: friends, followers, following.
      // The projection `SocialUserStatsDto` mirrors the wire shape exactly.
      return Object.freeze({
        friends: envelope.friends,
        followers: envelope.followers,
        following: envelope.following,
      }) satisfies SocialUserStatsDto;
    },
  });
}
