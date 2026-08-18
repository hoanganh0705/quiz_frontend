

import * as Sentry from "@sentry/nextjs";

import { getAchievements } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
ListBadgeCatalogParams,
ListMyBadgesParams,
GetMyAchievementHistoryParams,
GetUserAchievementHistoryParams,
} from "@/lib/api/generated/schemas";

import type {
ListBadgeCatalogResult,
ListMyBadgesResult,
GetBadgeDetailsResult,
GetPublicAchievementProfileResult,
GetMyBadgeProgressResult,
GetMyAchievementHistoryResult,
GetMyBadgeAnalyticsResult,
GetUserAchievementHistoryResult,
ReevaluateUserBadgesResult,
} from "@/lib/api/generated/achievements/achievements";

export async function listBadges(
params?: ListBadgeCatalogParams,
): Promise<ListBadgeCatalogResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "achievements.listBadges",
  });
const data = await getAchievements().listBadgeCatalog(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Badge catalog response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getBadgeByCode(
badgeId: string,
): Promise<GetBadgeDetailsResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.getBadgeDetails(${badgeId})`,
  });
const data = await getAchievements().getBadgeDetails(badgeId);
return data.data ?? null;
}

export async function getMyBadges(
params?: ListMyBadgesParams,
): Promise<ListMyBadgesResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "achievements.getMyBadges",
  });
const data = await getAchievements().listMyBadges(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "My badges response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getMyBadgeProgress(
badgeId: string,
): Promise<GetMyBadgeProgressResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.getMyBadgeProgress(${badgeId})`,
  });
const data = await getAchievements().getMyBadgeProgress(badgeId);
return data.data ?? null;
}

export async function getMyAchievementHistory(
params?: GetMyAchievementHistoryParams,
): Promise<GetMyAchievementHistoryResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "achievements.getMyAchievementHistory",
  });
const data = await getAchievements().getMyAchievementHistory(params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Achievement history response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getMyBadgeAnalytics(): Promise<
GetMyBadgeAnalyticsResult["data"]
> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: "achievements.getMyBadgeAnalytics",
  });
const data = await getAchievements().getMyBadgeAnalytics();
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Badge analytics response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getUserBadges(
userId: string,
): Promise<GetPublicAchievementProfileResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.getUserBadges(${userId})`,
  });
const data = await getAchievements().getPublicAchievementProfile(userId);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "User badges response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function getUserAchievementHistory(
userId: string,
params?: GetUserAchievementHistoryParams,
): Promise<GetUserAchievementHistoryResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.getUserAchievementHistory(${userId})`,
  });
const data = await getAchievements().getUserAchievementHistory(userId, params);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "User achievement history response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}

export async function revokeUserBadge(
userId: string,
badgeId: string,
): Promise<unknown> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.revokeUserBadge(${userId}, ${badgeId})`,
  });
const data = await getAchievements().revokeUserBadge(userId, badgeId);
return data;
}

export async function reevaluateUserBadges(
userId: string,
): Promise<ReevaluateUserBadgesResult["data"]> {
Sentry.addBreadcrumb({
category: "phase5:service",
message: `achievements.reevaluateUserBadges(${userId})`,
  });
const data = await getAchievements().reevaluateUserBadges(userId);
if (!data.data) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Reevaluate badges response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return data.data;
}
