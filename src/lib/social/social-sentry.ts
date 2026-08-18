

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_1_BREADCRUMB_CATEGORY = "social:6.1" as const;

export const SOCIAL_EPIC_6_1_VERSION = "1.0.0" as const;

export interface SocialServiceBreadcrumbData {

route: string;

status?: number;

durationMs?: number;

code?: string;

targetUserId?: string;
}

export interface SocialMutationBreadcrumbData {

action: string;

targetUserId: string;

status?: number;

code?: string;
}

export const EPIC_6_9_BREADCRUMB_CATEGORY = "social:6.9" as const;

export const SOCIAL_EPIC_6_9_VERSION = "6.9.0" as const;

export interface FeedBreadcrumbData {

route: string;

reason?: "service" | "unknown_discriminator" | "rate_limit";

discriminator?: string;

status?: number;

durationMs?: number;

code?: string;

epicVersion?: string;
}

export function addFeedBreadcrumb(data: FeedBreadcrumbData): void {
const payload: Record<string, string | number> = {
route: data.route,
epic: data.epicVersion ?? SOCIAL_EPIC_6_9_VERSION,
  };
if (data.reason !== undefined) payload.reason = data.reason;
if (data.discriminator !== undefined) payload.discriminator = data.discriminator;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_9_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export function addSocialServiceBreadcrumb(
data: SocialServiceBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: data.route,
epic: SOCIAL_EPIC_6_1_VERSION,
  };
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;
if (data.targetUserId !== undefined) {
payload.targetUserId = data.targetUserId;
  }

Sentry.addBreadcrumb({
category: EPIC_6_1_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export function addSocialMutationBreadcrumb(
data: SocialMutationBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
action: data.action,
targetUserId: data.targetUserId,
epic: SOCIAL_EPIC_6_1_VERSION,
  };
if (data.status !== undefined) payload.status = data.status;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_1_BREADCRUMB_CATEGORY,
data: payload,
  });
}
