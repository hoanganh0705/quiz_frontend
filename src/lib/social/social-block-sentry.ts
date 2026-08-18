

import * as Sentry from "@sentry/nextjs";

import type { AnalyticsKind } from "@/features/social/types/analytics";
import type { FriendLeaderboardPeriod } from "@/features/social/types/analytics";

export const EPIC_6_3_BREADCRUMB_CATEGORY = "social:6.3" as const;

export const SOCIAL_EPIC_6_3_VERSION = "1.0.0" as const;

export const SOCIAL_ANALYTICS_ROUTES = {
getUserSocialStats: "social.getUserSocialStats",
getMySocialAnalytics: "social.getMySocialAnalytics",
getFriendLeaderboard: "social.getFriendLeaderboard",
} as const;

export type SocialAnalyticsRoute =
(typeof SOCIAL_ANALYTICS_ROUTES)[keyof typeof SOCIAL_ANALYTICS_ROUTES];

export interface SocialAnalyticsBreadcrumbData {

route: SocialAnalyticsRoute;

kind: AnalyticsKind;

targetUserId?: string;

period?: "week" | "month" | "all";

offset?: number;

limit?: number;

total?: number;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialAnalyticsBreadcrumb(
data: SocialAnalyticsBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
kind: data.kind,
epic: SOCIAL_EPIC_6_3_VERSION,
  };
if (data.targetUserId !== undefined) payload.targetUserId = data.targetUserId;
if (data.period !== undefined) payload.period = data.period;
if (data.offset !== undefined) payload.offset = data.offset;
if (data.limit !== undefined) payload.limit = data.limit;
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_3_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export interface SocialLeaderboardBreadcrumbData {

offset: number;

limit: number;

total?: number;

period?: FriendLeaderboardPeriod;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialLeaderboardBreadcrumb(
data: SocialLeaderboardBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: SOCIAL_ANALYTICS_ROUTES.getFriendLeaderboard,
period: data.period ?? "weekly",
offset: data.offset,
limit: data.limit,
epic: SOCIAL_EPIC_6_3_VERSION,
  };
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_3_BREADCRUMB_CATEGORY,
data: payload,
  });
}