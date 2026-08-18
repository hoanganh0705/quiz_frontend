

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_8_BREADCRUMB_CATEGORY = "social:6.8" as const;

export const SOCIAL_EPIC_6_8_VERSION = "1.0.0" as const;

export const SOCIAL_6_8_ROUTES = {
sendFriendRequest: "social.sendFriendRequest",
respondFriendRequest: "social.respondFriendRequest",
cancelFriendRequest: "social.cancelFriendRequest",
removeFriend: "social.removeFriend",
} as const;

export type Social68Route = (typeof SOCIAL_6_8_ROUTES)[keyof typeof SOCIAL_6_8_ROUTES];

export interface FriendRequestMutationBreadcrumbData {

route: Social68Route;

method: "POST" | "DELETE";

status?: number;

durationMs: number;

code?: string;

targetUserId: string;
}

export function addFriendRequestMutationBreadcrumb(
data: FriendRequestMutationBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
method: data.method,
epic: SOCIAL_EPIC_6_8_VERSION,
  };

if (data.status !== undefined) payload.status = data.status;
payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

payload.targetUserId = data.targetUserId;

Sentry.addBreadcrumb({
category: EPIC_6_8_BREADCRUMB_CATEGORY,
data: payload,
  });
}