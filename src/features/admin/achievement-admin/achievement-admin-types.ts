

export type {
UserBadgeProfile,
AchievementHistoryEntry,
AchievementHistoryFilters,
DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
ACHIEVEMENT_CACHE_KEYS,
AchievementErrorCode,
} from '@/features/achievements/types';

export type { NormalizedBadge } from '@/lib/realtime/dto-adapters';

export type { BadgeCatalogItemResponseDto as BadgeDto } from '@/lib/api/generated/schemas';

export type { MyBadgeItemDto as UserBadgeDto } from '@/lib/api/generated/schemas';

export interface AdminUserBadgeDto {
readonly badgeId: string;
readonly badgeName: string;
readonly rarity: string;
readonly earnedAt?: string;
}

export type { AdminAchievementHistoryItemDto as UserAchievementHistoryDto } from '@/lib/api/generated/schemas';
export type { OffsetPaginationMetaDto } from '@/lib/api/generated/schemas';
export type { GetUserAchievementHistory200 } from '@/lib/api/generated/schemas';

export type {
ReevaluateUserResponseDto as AchievementReevaluateResponseDto,
} from '@/lib/api/generated/schemas/reevaluateUserResponseDto';

export {
  // re-export the service-constructed type (not in generated schemas)
} from '@/features/admin/services/achievement-admin.service';

export interface AchievementBadgeRevokeResponseDto {
readonly userId: string;
readonly badgeId: string;
readonly revokedAt: string; // ISO 8601
}

export const REEVAL_LIFECYCLE_IDLE = 'idle' as const;

export const REEVAL_LIFECYCLE_RUNNING = 'running' as const;

export const REEVAL_LIFECYCLE_COMPLETED = 'completed' as const;

export const REEVAL_LIFECYCLE_FAILED = 'failed' as const;

export type ReevalLifecycle =
| typeof REEVAL_LIFECYCLE_IDLE
  | typeof REEVAL_LIFECYCLE_RUNNING
  | typeof REEVAL_LIFECYCLE_COMPLETED
  | typeof REEVAL_LIFECYCLE_FAILED;

export function isReevalTerminal(lifecycle: ReevalLifecycle): boolean {
return (
lifecycle === REEVAL_LIFECYCLE_COMPLETED ||
lifecycle === REEVAL_LIFECYCLE_FAILED
  );
}

export function isReevalRunning(lifecycle: ReevalLifecycle): boolean {
return lifecycle === REEVAL_LIFECYCLE_RUNNING;
}

export function getReevalLifecycleLabel(lifecycle: ReevalLifecycle): string {
switch (lifecycle) {
case REEVAL_LIFECYCLE_IDLE:
return 'Re-evaluate achievements';
case REEVAL_LIFECYCLE_RUNNING:
return 'Re-evaluation running…';
case REEVAL_LIFECYCLE_COMPLETED:
return 'Re-evaluate again';
case REEVAL_LIFECYCLE_FAILED:
return 'Retry re-evaluation';
default: {

const _exhaustive: never = lifecycle;
return _exhaustive;
    }
  }
}

export interface ReevalJobInfo {

readonly isJobIdExposed: false;

readonly lifecycle: ReevalLifecycle;
}
