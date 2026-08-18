

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

export async function getBlockedUsers(): Promise<
SocialControllerGetBlockedUsersResult
> {
addSocialServiceBreadcrumb({
route: "social.getBlockedUsers",
  });
const wire = await getSocial().socialControllerGetBlockedUsers();
return requireEnvelope(wire, "Get blocked users response missing envelope");
}

export async function getSocialCounts(): Promise<
SocialControllerGetSocialCountsResult
> {
addSocialServiceBreadcrumb({
route: "social.getSocialCounts",
  });
const wire = await getSocial().socialControllerGetSocialCounts();
return requireEnvelope(wire, "Get social counts response missing envelope");
}

export async function getPendingRequests(): Promise<
SocialControllerGetPendingRequestsResult
> {
addSocialServiceBreadcrumb({
route: "social.getPendingRequests",
  });
const wire = await getSocial().socialControllerGetPendingRequests();
return requireEnvelope(wire, "Get pending requests response missing envelope");
}

export async function getSentRequests(): Promise<
SocialControllerGetSentRequestsResult
> {
addSocialServiceBreadcrumb({
route: "social.getSentRequests",
  });
const wire = await getSocial().socialControllerGetSentRequests();
return requireEnvelope(wire, "Get sent requests response missing envelope");
}

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
