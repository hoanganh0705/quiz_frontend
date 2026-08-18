

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_4_BREADCRUMB_CATEGORY = "social:6.4" as const;

export const SOCIAL_EPIC_6_4_VERSION = "1.0.0" as const;

export const SOCIAL_6_4_ROUTES = {
getMutualFriends: "social.getMutualFriends",
getMutualFollowers: "social.getMutualFollowers",
getUserActivity: "social.getUserActivity",
} as const;

export type Social64Route =
(typeof SOCIAL_6_4_ROUTES)[keyof typeof SOCIAL_6_4_ROUTES];

export type MutualSurface = "mutuals-friends" | "mutuals-followers";

export interface SocialMutualBreadcrumbData {

route:
| typeof SOCIAL_6_4_ROUTES.getMutualFriends
    | typeof SOCIAL_6_4_ROUTES.getMutualFollowers;

targetUserId: string;

surface: MutualSurface;

total?: number;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialMutualBreadcrumb(
data: SocialMutualBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
targetUserId: data.targetUserId,
surface: data.surface,
epic: SOCIAL_EPIC_6_4_VERSION,
  };
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_4_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export interface SocialActivityBreadcrumbData {

route: typeof SOCIAL_6_4_ROUTES.getUserActivity;

targetUserId: string;

surface: "user-activity";

rateLimited?: boolean;

cooldownSeconds?: number;

total?: number;

status?: number;

durationMs?: number;

code?: string;

reason?: string;

discriminator?: string;
}

export function addSocialActivityBreadcrumb(
data: SocialActivityBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
targetUserId: data.targetUserId,
surface: data.surface,
epic: SOCIAL_EPIC_6_4_VERSION,
  };
if (data.rateLimited !== undefined) payload.rateLimited = data.rateLimited ? 1 : 0;
if (data.cooldownSeconds !== undefined) payload.cooldownSeconds = data.cooldownSeconds;
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;
if (data.reason !== undefined) payload.reason = data.reason;
if (data.discriminator !== undefined) payload.discriminator = data.discriminator;

Sentry.addBreadcrumb({
category: EPIC_6_4_BREADCRUMB_CATEGORY,
data: payload,
  });
}
