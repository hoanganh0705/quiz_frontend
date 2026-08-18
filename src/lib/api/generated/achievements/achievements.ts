

import type {
GetBadgeDetails200,
GetMyAchievementHistory200,
GetMyAchievementHistoryParams,
GetMyBadgeAnalytics200,
GetMyBadgeProgress200,
GetPublicAchievementProfile200,
GetUserAchievementHistory200,
GetUserAchievementHistoryParams,
ListBadgeCatalog200,
ListBadgeCatalogParams,
ListMyBadges200,
ListMyBadgesParams,
ReevaluateUserBadges200
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getAchievements = () => {

const listBadgeCatalog = (
params?: ListBadgeCatalogParams,
 ) => {
return orvalCustomInstance<ListBadgeCatalog200>(
{url: `/api/v1/achievements/badges`, method: 'GET',
params
    },
      );
    }

const listMyBadges = (
params?: ListMyBadgesParams,
 ) => {
return orvalCustomInstance<ListMyBadges200>(
{url: `/api/v1/achievements/me/badges`, method: 'GET',
params
    },
      );
    }

const getBadgeDetails = (
badgeId: string,
 ) => {
return orvalCustomInstance<GetBadgeDetails200>(
{url: `/api/v1/achievements/badges/${badgeId}`, method: 'GET'
    },
      );
    }

const revokeUserBadge = (
userId: string,
badgeId: string,
 ) => {
return orvalCustomInstance<unknown>(
{url: `/api/v1/achievements/users/${userId}/badges/${badgeId}`, method: 'DELETE'
    },
      );
    }

const getPublicAchievementProfile = (
userId: string,
 ) => {
return orvalCustomInstance<GetPublicAchievementProfile200>(
{url: `/api/v1/achievements/users/${userId}/achievements`, method: 'GET'
    },
      );
    }

const getMyBadgeProgress = (
badgeId: string,
 ) => {
return orvalCustomInstance<GetMyBadgeProgress200>(
{url: `/api/v1/achievements/users/me/badges/${badgeId}/progress`, method: 'GET'
    },
      );
    }

const getMyAchievementHistory = (
params?: GetMyAchievementHistoryParams,
 ) => {
return orvalCustomInstance<GetMyAchievementHistory200>(
{url: `/api/v1/achievements/users/me/achievements/history`, method: 'GET',
params
    },
      );
    }

const getMyBadgeAnalytics = (

 ) => {
return orvalCustomInstance<GetMyBadgeAnalytics200>(
{url: `/api/v1/achievements/users/me/badges/analytics`, method: 'GET'
    },
      );
    }

const reevaluateUserBadges = (
userId: string,
 ) => {
return orvalCustomInstance<ReevaluateUserBadges200>(
{url: `/api/v1/admin/achievements/reevaluate/${userId}`, method: 'POST'
    },
      );
    }

const getUserAchievementHistory = (
userId: string,
params?: GetUserAchievementHistoryParams,
 ) => {
return orvalCustomInstance<GetUserAchievementHistory200>(
{url: `/api/v1/admin/achievements/reevaluate/${userId}/history`, method: 'GET',
params
    },
      );
    }
return {listBadgeCatalog,listMyBadges,getBadgeDetails,revokeUserBadge,getPublicAchievementProfile,getMyBadgeProgress,getMyAchievementHistory,getMyBadgeAnalytics,reevaluateUserBadges,getUserAchievementHistory}};
export type ListBadgeCatalogResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['listBadgeCatalog']>>>
export type ListMyBadgesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['listMyBadges']>>>
export type GetBadgeDetailsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getBadgeDetails']>>>
export type RevokeUserBadgeResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['revokeUserBadge']>>>
export type GetPublicAchievementProfileResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getPublicAchievementProfile']>>>
export type GetMyBadgeProgressResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getMyBadgeProgress']>>>
export type GetMyAchievementHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getMyAchievementHistory']>>>
export type GetMyBadgeAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getMyBadgeAnalytics']>>>
export type ReevaluateUserBadgesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['reevaluateUserBadges']>>>
export type GetUserAchievementHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAchievements>['getUserAchievementHistory']>>>
