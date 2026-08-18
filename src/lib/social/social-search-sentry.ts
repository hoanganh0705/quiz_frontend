

import * as Sentry from "@sentry/nextjs";

import type { SocialListKind } from "@/features/social/components/SocialListKind";

export const EPIC_6_2_BREADCRUMB_CATEGORY = "social:6.2" as const;

export const SOCIAL_EPIC_6_2_VERSION = "1.0.0" as const;

export interface SocialListBreadcrumbData {

kind: SocialListKind;

targetUserId: string;

offset: number;

limit: number;

total?: number;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialListBreadcrumb(
data: SocialListBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
kind: data.kind,
targetUserId: data.targetUserId,
offset: data.offset,
limit: data.limit,
epic: SOCIAL_EPIC_6_2_VERSION,
  };
if (data.total !== undefined) payload.total = data.total;
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_2_BREADCRUMB_CATEGORY,
data: payload,
  });
}

export interface SocialCountsBadgeBreadcrumbData {

targetUserId: string;

status?: number;

durationMs?: number;

code?: string;
}

export function addSocialCountsBadgeBreadcrumb(
data: SocialCountsBadgeBreadcrumbData,
): void {
const payload: Record<string, string | number> = {
route: "social.getCounts",
targetUserId: data.targetUserId,
epic: SOCIAL_EPIC_6_2_VERSION,
  };
if (data.status !== undefined) payload.status = data.status;
if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
if (data.code !== undefined) payload.code = data.code;

Sentry.addBreadcrumb({
category: EPIC_6_2_BREADCRUMB_CATEGORY,
data: payload,
  });
}