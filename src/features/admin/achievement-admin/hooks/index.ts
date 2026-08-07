/**
 * `features/admin/achievement-admin/hooks/index.ts`
 *
 * Barrel export for all achievement-admin hooks.
 *
 * Source epic:   Epic 7.8.
 * Source ticket: TKT-7.8.C1–C6.
 */

export { useUserBadges } from './useUserBadges';
export type { UseUserBadgesResult } from './useUserBadges';

export { useUserAchievementHistory } from './useUserAchievementHistory';
export type { UseUserAchievementHistoryResult } from './useUserAchievementHistory';

export { useBadgeCatalog } from './useBadgeCatalog';
export type { UseBadgeCatalogOptions, UseBadgeCatalogResult } from './useBadgeCatalog';

export { useReevaluateUserAchievements } from './useReevaluateUserAchievements';
export type {
  UseReevaluateUserAchievementsAudit,
  UseReevaluateUserAchievementsResult,
} from './useReevaluateUserAchievements';

export { useRevokeUserBadge } from './useRevokeUserBadge';
export type { UseRevokeUserBadgeAudit, UseRevokeUserBadgeResult } from './useRevokeUserBadge';

export { useAsyncJobStatus } from './useAsyncJobStatus';
export type { UseAsyncJobStatusResult } from './useAsyncJobStatus';
