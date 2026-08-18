

import { ApiError, getSocial } from "@/lib/api";

import {
addFriendRequestMutationBreadcrumb,
SOCIAL_6_8_ROUTES,
} from "@/lib/social/social-friend-request-mutation-sentry";

export type RespondFriendRequestAction = "accept" | "decline";

async function measuredCall<T>(args: {
action: string;
targetUserId: string;
method: "POST" | "DELETE";
route: string;
call: () => Promise<T>;
}): Promise<T> {
const start = performance.now();
try {
const result = await args.call();
const durationMs = performance.now() - start;
addFriendRequestMutationBreadcrumb({
route:
SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
args.route,
method: args.method,
status: 200,
durationMs,
targetUserId: args.targetUserId,
    });
return result;
  } catch (err) {
const durationMs = performance.now() - start;
if (err instanceof ApiError) {
addFriendRequestMutationBreadcrumb({
route:
SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
args.route,
method: args.method,
status: err.status,
durationMs,
code: err.code,
targetUserId: args.targetUserId,
      });
    } else {

addFriendRequestMutationBreadcrumb({
route:
SOCIAL_6_8_ROUTES[args.route as keyof typeof SOCIAL_6_8_ROUTES] ??
args.route,
method: args.method,
status: undefined,
durationMs,
targetUserId: args.targetUserId,
      });
    }
throw err;
  }
}

export async function sendFriendRequest(userId: string): Promise<void> {
await measuredCall({
action: "sendFriendRequest",
targetUserId: userId,
method: "POST",
route: "social.sendFriendRequest",
call: async () => {
void await getSocial().socialControllerSendFriendRequest(userId);

return undefined as void;
    },
  });
}

export async function respondFriendRequest(
friendshipId: string,
action: RespondFriendRequestAction,
): Promise<void> {
await measuredCall({
action: "respondFriendRequest",

targetUserId: action,
method: "POST",
route: "social.respondFriendRequest",
call: async () => {
void await getSocial().socialControllerRespondToFriendRequest(
friendshipId,
{ accept: action === "accept" },
      );

return undefined as void;
    },
  });
}

export async function cancelFriendRequest(
friendshipId: string,
): Promise<void> {
await measuredCall({
action: "cancelFriendRequest",

targetUserId: "cancelFriendRequest",
method: "DELETE",
route: "social.cancelFriendRequest",
call: async () => {
void await getSocial().socialControllerCancelFriendRequest(
friendshipId,
      );

return undefined as void;
    },
  });
}

export async function unfriend(userId: string): Promise<void> {
await measuredCall({
action: "unfriend",
targetUserId: userId,
method: "DELETE",
route: "social.removeFriend",
call: async () => {
void await getSocial().socialControllerRemoveFriend(userId);

return undefined as void;
    },
  });
}