

import type { AdminAchievementHistoryItemDtoMetadata } from './adminAchievementHistoryItemDtoMetadata';

export interface AdminAchievementHistoryItemDto {

userBadgeId: string;

userId: string;

badgeId: string;

badgeSlug: string;

badgeName: string;

badgeType: string;

badgeCategory: string;

earnedAt: string;

badgeVersion: string;

expiresAt: string | null;

revokedAt: string | null;

revocationReason: string | null;

metadata: AdminAchievementHistoryItemDtoMetadata;

isActive: boolean;
}
