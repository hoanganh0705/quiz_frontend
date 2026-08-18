

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

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

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
