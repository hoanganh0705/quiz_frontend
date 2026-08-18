

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_6_BREADCRUMB_CATEGORY = "social:6.6" as const;

export const SOCIAL_EPIC_6_6_VERSION = "1.0.0" as const;

export const SOCIAL_6_6_ROUTES = {
followUser: "social.followUser",
unfollowUser: "social.unfollowUser",
} as const;

export type Social66Route = (typeof SOCIAL_6_6_ROUTES)[keyof typeof SOCIAL_6_6_ROUTES];

export interface FollowMutationBreadcrumbData {

route: Social66Route;

method: "POST" | "DELETE";

status?: number;

durationMs: number;

code?: string;

targetUserId: string;
}

export function addFollowMutationBreadcrumb(
data: FollowMutationBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
method: data.method,
epic: SOCIAL_EPIC_6_6_VERSION,
  };

if (data.status !== undefined) payload.status = data.status;
payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

payload.targetUserId = data.targetUserId;

Sentry.addBreadcrumb({
category: EPIC_6_6_BREADCRUMB_CATEGORY,
data: payload,
  });
}
