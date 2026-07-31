/**
 * Auth domain types — aligned with backend DTOs.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source tickets: TKT-2.5.1, TKT-2.5.2.
 */

// Re-export from generated SDK — CurrentUserResponseDto is the slim identity payload
// returned by GET /auth/me. It contains only userId, username, email, role, and isVerified.
// This is used to bootstrap auth state without fetching the full profile.
export type {
  CurrentUserResponseDto,
} from '@/lib/api/generated/schemas';

// Re-export wrapped response type for SDK calls
export type {
  AuthControllerGetCurrentUserResult,
} from '@/lib/api/generated/auth/auth';

/**
 * Re-export UserMeResponseDto for useAuth/useUser hooks.
 * UserMeResponseDto is the full profile payload returned by GET /users/me.
 * It contains displayName, avatarUrl, bio, XP, streaks, settings, and timestamps.
 */
export type {
  UserMeResponseDto,
} from '@/lib/api/generated/schemas';
