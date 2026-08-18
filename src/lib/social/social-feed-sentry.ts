

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_9_BREADCRUMB_CATEGORY = "social:6.9" as const;

export const SOCIAL_FEED_BREADCRUMB_VERSION = "1.0.0" as const;

export const SOCIAL_6_9_ROUTES = {
getFeed: "social.getFeed",
} as const;

export type Social69Route =
(typeof SOCIAL_6_9_ROUTES)[keyof typeof SOCIAL_6_9_ROUTES];

export interface SocialFeedBreadcrumbData {

route: typeof SOCIAL_6_9_ROUTES.getFeed;

status?: number;

durationMs?: number;

code?: string;

viewerUserId?: string;

hasMore?: boolean;

total?: number;

reason?: string;

discriminator?: string;
}

export function addSocialFeedBreadcrumb(
data: SocialFeedBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
epic: SOCIAL_FEED_BREADCRUMB_VERSION,
  };
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;
if (data.viewerUserId !== undefined) payload.viewerUserId = data.viewerUserId;
if (data.hasMore !== undefined) payload.hasMore = data.hasMore ? 1 : 0;
if (data.total !== undefined) payload.total = data.total;
if (data.reason !== undefined) payload.reason = data.reason;
if (data.discriminator !== undefined) {
payload.discriminator = data.discriminator;
  }

Sentry.addBreadcrumb({
category: EPIC_6_9_BREADCRUMB_CATEGORY,
data: payload,
  });
}
