/**
 * `achievements.service.ts` — Achievements and badge service.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F5.
 *
 * ## Pattern
 *
 * Thin SDK pass-throughs with Sentry breadcrumbs and `data` envelope
 * unwrapping. Follows the same discipline as `tournaments.service.ts`:
 *
 *   - Pure forwarders — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR`.
 *
 * ## DTO adapters
 *
 * `listBadges` and `getMyBadges` use `normalizeBadgeArray` (from
 * `@/lib/realtime/dto-adapters`) because the backend may return bare
 * arrays for these endpoints. See the `TODO(backend):` comment in
 * `dto-adapters.ts` re: the unnormalised `listBadges` response.
 */

import * as Sentry from "@sentry/nextjs";

import { getAchievements } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import {
  normalizeBadgeArray,
  type NormalizedBadge,
} from "@/lib/realtime/dto-adapters";

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
  GetMyBadgeAnalyticsResult,
  GetUserAchievementHistoryResult,
  ReevaluateUserBadgesResult,
} from "@/lib/api/generated/achievements/achievements";

// ─── Badge catalog ─────────────────────────────────────────────────────────

/**
 * `GET /api/v1/achievements/badges`
 *
 * Returns the full catalog of all available badges.
 * Uses `normalizeBadgeArray` — the backend may return a bare array
 * per master plan §1.3 line 61.
 */
export async function listBadges(
  params?: ListBadgeCatalogParams,
): Promise<NormalizedBadge[]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "achievements.listBadges",
  });
  const data = await getAchievements().listBadgeCatalog(params);

  // TODO(backend): The backend may return a bare array instead of { data: [...] }
  // for this endpoint. `normalizeBadgeArray` handles both shapes. Once the
  // backend is confirmed to return the envelope, the adapter can be removed.
  if (Array.isArray(data)) {
    return normalizeBadgeArray(data);
  }
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Badge catalog response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return normalizeBadgeArray(data.data);
}

/**
 * `GET /api/v1/achievements/badges/:badgeId`
 */
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

// ─── My achievements ────────────────────────────────────────────────────────

/**
 * `GET /api/v1/achievements/me/badges`
 *
 * Returns badges earned by the authenticated user.
 * Uses `normalizeBadgeArray` — the backend may return a bare array
 * per master plan §1.3 line 61.
 */
export async function getMyBadges(
  params?: ListMyBadgesParams,
): Promise<NormalizedBadge[]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "achievements.getMyBadges",
  });
  const data = await getAchievements().listMyBadges(params);

  // TODO(backend): Same as `listBadges` — bare array may be returned.
  if (Array.isArray(data)) {
    return normalizeBadgeArray(data);
  }
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "My badges response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return normalizeBadgeArray(data.data);
}

/**
 * `GET /api/v1/achievements/users/me/badges/:badgeId/progress`
 *
 * Returns the authenticated user's progress toward a specific badge.
 */
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

/**
 * `GET /api/v1/achievements/users/me/achievements/history`
 *
 * Returns the authenticated user's achievement history (earned badges + milestones)
 * in chronological order.
 */
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

/**
 * `GET /api/v1/achievements/users/me/badges/analytics`
 *
 * Returns analytics data for the authenticated user's achievements.
 */
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

// ─── Public user achievements ───────────────────────────────────────────

/**
 * `GET /api/v1/achievements/users/:userId/achievements`
 *
 * Returns public badges and progress for a user's profile.
 */
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

/**
 * `GET /api/v1/admin/achievements/reevaluate/:userId/history`
 *
 * Returns achievement history for a user (admin).
 */
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

// ─── Admin ───────────────────────────────────────────────────────────────

/**
 * `DELETE /api/v1/achievements/users/:userId/badges/:badgeId`
 *
 * Revokes a badge from a user. Requires admin permissions.
 * The SDK returns `unknown` for this endpoint (no structured response body).
 */
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

/**
 * `POST /api/v1/admin/achievements/reevaluate/:userId`
 *
 * Forces a re-evaluation of every active badge for the specified user.
 * Badges the user does not yet have will be checked against the rule engine.
 * Use this to correct missed awards or retroactively grant badges after
 * data fixes. Requires admin permissions.
 */
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
