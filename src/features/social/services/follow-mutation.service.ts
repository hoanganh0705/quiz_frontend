

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetUserSocialStatsResult,
} from "@/lib/api/generated/social/social";

import {
addFollowMutationBreadcrumb,
SOCIAL_6_6_ROUTES,
} from "@/lib/social/social-follow-mutation-sentry";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import type { SocialUserStatsDto } from "@/features/social/types";

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

void addSocialServiceBreadcrumb({
route: args.route,
status: err.status,
durationMs,
code: err.code,
targetUserId: args.targetUserId,
        });
      }
    } else {

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

export async function followUser(userId: string): Promise<void> {
await measuredCall({
action: "follow",
targetUserId: userId,
method: "POST",
route: "social.followUser",
call: async () => {
void await getSocial().socialControllerFollowUser(userId);

return undefined as void;
    },
  });
}

export async function unfollowUser(userId: string): Promise<void> {
await measuredCall({
action: "unfollow",
targetUserId: userId,
method: "DELETE",
route: "social.unfollowUser",
call: async () => {
void await getSocial().socialControllerUnfollowUser(userId);

return undefined as void;
    },
  });
}

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

return Object.freeze({
friends: envelope.friends,
followers: envelope.followers,
following: envelope.following,
      }) satisfies SocialUserStatsDto;
    },
  });
}
