

import { getAchievements } from '@/lib/api';
import type { ReevaluateUserResponseDto } from '@/lib/api/generated/schemas';

export type {
ReevaluateUserBadgesResult,
RevokeUserBadgeResult,
} from '@/lib/api/generated/achievements/achievements';

export type AchievementReevaluateResponseDto = ReevaluateUserResponseDto;

export interface AchievementBadgeRevokeResponseDto {
userId: string;
badgeId: string;
revokedAt: string;
}

export async function reevaluateUserAchievements(
userId: string,
): Promise<AchievementReevaluateResponseDto> {
const sdk = getAchievements();
const wrapped = await sdk.reevaluateUserBadges(userId);
return (wrapped.data.data as AchievementReevaluateResponseDto) ?? (wrapped.data as unknown as AchievementReevaluateResponseDto);
}

export async function revokeUserBadge(
userId: string,
badgeId: string,
): Promise<AchievementBadgeRevokeResponseDto> {
const sdk = getAchievements();
await sdk.revokeUserBadge(userId, badgeId);
return {
userId,
badgeId,
revokedAt: new Date().toISOString(),
  };
}
