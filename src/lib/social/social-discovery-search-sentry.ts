

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_7_BREADCRUMB_CATEGORY = "social:6.7" as const;

export const SOCIAL_EPIC_6_7_VERSION = "1.0.0" as const;

export const SOCIAL_6_7_ROUTES = {
blockUser: "social.blockUser",
unblockUser: "social.unblockUser",
} as const;

export type Social67Route = (typeof SOCIAL_6_7_ROUTES)[keyof typeof SOCIAL_6_7_ROUTES];

export interface BlockMutationBreadcrumbData {

route: Social67Route;

method: "POST" | "DELETE";

status?: number;

durationMs: number;

code?: string;

targetUserId: string;
}

export function addBlockMutationBreadcrumb(
data: BlockMutationBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
method: data.method,
epic: SOCIAL_EPIC_6_7_VERSION,
  };

if (data.status !== undefined) payload.status = data.status;
payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

payload.targetUserId = data.targetUserId;

Sentry.addBreadcrumb({
category: EPIC_6_7_BREADCRUMB_CATEGORY,
data: payload,
  });
}