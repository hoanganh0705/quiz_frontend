

import { ApiError, getSocial } from "@/lib/api";

import {
addBlockMutationBreadcrumb,
SOCIAL_6_7_ROUTES,
} from "@/lib/social/social-discovery-search-sentry";

export interface BlockUserInput {

reason?: string;
}

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
addBlockMutationBreadcrumb({
route:
SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
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
addBlockMutationBreadcrumb({
route:
SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
args.route,
method: args.method,
status: err.status,
durationMs,
code: err.code,
targetUserId: args.targetUserId,
      });
    } else {

addBlockMutationBreadcrumb({
route:
SOCIAL_6_7_ROUTES[args.route as keyof typeof SOCIAL_6_7_ROUTES] ??
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

export async function blockUser(
userId: string,
input: BlockUserInput = {},
): Promise<void> {
await measuredCall({
action: "block",
targetUserId: userId,
method: "POST",
route: "social.blockUser",
call: async () => {
void await getSocial().socialControllerBlockUser(userId, input);

return undefined as void;
    },
  });
}

export async function unblockUser(userId: string): Promise<void> {
await measuredCall({
action: "unblock",
targetUserId: userId,
method: "DELETE",
route: "social.unblockUser",
call: async () => {
void await getSocial().socialControllerUnblockUser(userId);

return undefined as void;
    },
  });
}