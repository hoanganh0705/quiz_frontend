import * as Sentry from "@sentry/nextjs";

import { getAchievements, unwrapEnvelope } from "@/lib/api";

import type {
  GetBadgeDetailsResult,
  GetMyAchievementHistoryResult,
  GetMyBadgeAnalyticsResult,
  GetMyBadgeProgressResult,
  GetPublicAchievementProfileResult,
  GetUserAchievementHistoryResult,
  ListBadgeCatalogResult,
  ListMyBadgesResult,
  ReevaluateUserBadgesResult,
} from "@/lib/api/generated/achievements/achievements";
import type {
  GetMyAchievementHistoryParams,
  GetUserAchievementHistoryParams,
  ListBadgeCatalogParams,
  ListMyBadgesParams,
} from "@/lib/api/generated/schemas";

export async function listBadges(
  params?: ListBadgeCatalogParams,
): Promise<ListBadgeCatalogResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: "achievements.listBadges",
  });
  const response = await getAchievements().listBadgeCatalog(params);
  return unwrapEnvelope(
    response,
    "Badge catalog response missing data envelope",
  );
}

export async function getBadgeByCode(
  badgeId: string,
): Promise<GetBadgeDetailsResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.getBadgeDetails(${badgeId})`,
  });
  const data = await getAchievements().getBadgeDetails(badgeId);
  return data.data ?? null;
}

export async function getMyBadges(
  params?: ListMyBadgesParams,
): Promise<ListMyBadgesResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: "achievements.getMyBadges",
  });
  const response = await getAchievements().listMyBadges(params);
  return unwrapEnvelope(response, "My badges response missing data envelope");
}

export async function getMyBadgeProgress(
  badgeId: string,
): Promise<GetMyBadgeProgressResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.getMyBadgeProgress(${badgeId})`,
  });
  const data = await getAchievements().getMyBadgeProgress(badgeId);
  return data.data ?? null;
}

export async function getMyAchievementHistory(
  params?: GetMyAchievementHistoryParams,
): Promise<GetMyAchievementHistoryResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: "achievements.getMyAchievementHistory",
  });
  const response = await getAchievements().getMyAchievementHistory(params);
  return unwrapEnvelope(
    response,
    "Achievement history response missing data envelope",
  );
}

export async function getMyBadgeAnalytics(): Promise<
  GetMyBadgeAnalyticsResult["data"]
> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: "achievements.getMyBadgeAnalytics",
  });
  const response = await getAchievements().getMyBadgeAnalytics();
  return unwrapEnvelope(
    response,
    "Badge analytics response missing data envelope",
  );
}

export async function getUserBadges(
  userId: string,
): Promise<GetPublicAchievementProfileResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.getUserBadges(${userId})`,
  });
  const response = await getAchievements().getPublicAchievementProfile(userId);
  return unwrapEnvelope(response, "User badges response missing data envelope");
}

export async function getUserAchievementHistory(
  userId: string,
  params?: GetUserAchievementHistoryParams,
): Promise<GetUserAchievementHistoryResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.getUserAchievementHistory(${userId})`,
  });
  const response = await getAchievements().getUserAchievementHistory(
    userId,
    params,
  );
  return unwrapEnvelope(
    response,
    "User achievement history response missing data envelope",
  );
}

export async function revokeUserBadge(userId: string, badgeId: string) {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.revokeUserBadge(${userId}, ${badgeId})`,
  });
  return getAchievements().revokeUserBadge(userId, badgeId);
}

export async function reevaluateUserBadges(
  userId: string,
): Promise<ReevaluateUserBadgesResult["data"]> {
  Sentry.addBreadcrumb({
    category: "achievements:service",
    message: `achievements.reevaluateUserBadges(${userId})`,
  });
  const response = await getAchievements().reevaluateUserBadges(userId);
  return unwrapEnvelope(
    response,
    "Reevaluate badges response missing data envelope",
  );
}
