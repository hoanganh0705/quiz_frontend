

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_5_BREADCRUMB_CATEGORY = "social:6.5" as const;

export const SOCIAL_EPIC_6_5_VERSION = "1.0.0" as const;

export const SOCIAL_6_5_ROUTES = {
getSuggestions: "social.getSuggestions",
getTrendingUsers: "social.getTrendingUsers",
getSearchSuggestions: "social.getSearchSuggestions",
searchUsers: "social.searchUsers",
} as const;

export type Social65Route = (typeof SOCIAL_6_5_ROUTES)[keyof typeof SOCIAL_6_5_ROUTES];

export type SocialDiscoveryKind = "suggestions" | "trending" | "search-suggestions";

export type SocialDiscoverySurface = "suggestions-page" | "trending-page";

export interface SocialDiscoveryBreadcrumbData {

route:
| typeof SOCIAL_6_5_ROUTES.getSuggestions
    | typeof SOCIAL_6_5_ROUTES.getTrendingUsers
    | typeof SOCIAL_6_5_ROUTES.getSearchSuggestions;

kind: SocialDiscoveryKind;

surface?: SocialDiscoverySurface;

normalizedQueryLength?: number;

offset?: number;

limit?: number;

total?: number;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialDiscoveryBreadcrumb(data: SocialDiscoveryBreadcrumbData): void {
const payload: Record<string, string | number> = {
route: data.route,
kind: data.kind,
epic: SOCIAL_EPIC_6_5_VERSION,
  };
if (data.surface !== undefined) payload.surface = data.surface;
if (data.normalizedQueryLength !== undefined)
payload.normalizedQueryLength = data.normalizedQueryLength;
if (data.offset !== undefined) payload.offset = data.offset;
if (data.limit !== undefined) payload.limit = data.limit;
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_5_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export type SocialSearchSurface = "global-search-bar" | "social-search-page";

export interface SocialSearchBreadcrumbData {

route: typeof SOCIAL_6_5_ROUTES.searchUsers;

surface: SocialSearchSurface;

normalizedQueryLength: number;

offset?: number;

limit?: number;

total?: number;

cooldownSeconds?: number;

status?: number;

durationMs?: number;

code?: string;

reason?: string;
}

export function addSocialSearchBreadcrumb(data: SocialSearchBreadcrumbData): void {
const payload: Record<string, string | number> = {
route: data.route,
surface: data.surface,
normalizedQueryLength: data.normalizedQueryLength,
epic: SOCIAL_EPIC_6_5_VERSION,
  };
if (data.offset !== undefined) payload.offset = data.offset;
if (data.limit !== undefined) payload.limit = data.limit;
if (data.total !== undefined) payload.total = data.total;
if (data.cooldownSeconds !== undefined)
payload.cooldownSeconds = data.cooldownSeconds;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;
if (data.reason !== undefined) payload.reason = data.reason;

Sentry.addBreadcrumb({
category: EPIC_6_5_BREADCRUMB_CATEGORY,
data: payload,
  });
}
