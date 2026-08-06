/**
 * `features/admin/services/achievement-admin.service.ts` — Achievement admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E6.
 *
 * Thin service layer that wraps the achievement admin SDK functions.
 * The service is the only layer under `features/admin/**` that touches
 * the SDK for achievement admin.
 *
 * ## Functions
 *
 *   - `reevaluateUserAchievements(userId)` — wraps `reevaluateUserBadges`.
 *                                            Returns a job summary.
 *   - `revokeUserBadge(userId, badgeId)`   — wraps `revokeUserBadge`.
 *                                            Irreversible; documents
 *                                            `BADGE_NOT_GRANTED`.
 *
 * ## Error contract
 *
 *   - `REVAL_RUNNING` and `BADGE_NOT_GRANTED` codes are surfaced
 *     to the caller.
 *   - The service does NOT retry on `REVAL_RUNNING`. The hook layer
 *     decides whether to disable the button while the reevaluation
 *     is in flight.
 */

import { getAchievements } from '@/lib/api';
import type { ReevaluateUserResponseDto } from '@/lib/api/generated/schemas';

export type {
  ReevaluateUserBadgesResult,
  RevokeUserBadgeResult,
} from '@/lib/api/generated/achievements/achievements';

/** The reevaluation response DTO returned by the backend. */
export type AchievementReevaluateResponseDto = ReevaluateUserResponseDto;

/** The badge-revoke response DTO. */
export interface AchievementBadgeRevokeResponseDto {
  userId: string;
  badgeId: string;
  revokedAt: string;
}

/**
 * Re-evaluate a user's achievement state.
 *
 * @throws `ApiError<ErrorCode>` with `code: REVAL_RUNNING` when
 *         another reevaluation is in flight.
 */
export async function reevaluateUserAchievements(
  userId: string,
): Promise<AchievementReevaluateResponseDto> {
  const sdk = getAchievements();
  const wrapped = await sdk.reevaluateUserBadges(userId);
  return (wrapped.data.data as AchievementReevaluateResponseDto) ?? (wrapped.data as unknown as AchievementReevaluateResponseDto);
}

/**
 * Revoke a granted badge from a user. This is an irreversible operation.
 *
 * @throws `ApiError<ErrorCode>` with `code: BADGE_NOT_GRANTED` when
 *         the user has not been granted the badge.
 * @throws `ApiError<ErrorCode>` with `code: SELF_ACTION_FORBIDDEN`
 *         when the target user is the calling admin.
 */
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
