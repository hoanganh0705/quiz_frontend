/**
 * Users domain types — aligned with backend DTOs.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 *
 * ## Type Hierarchy
 *
 * - `CurrentUserResponseDto` (from `@/features/auth/types`) — slim identity
 *   from `GET /auth/me`: userId, username, email, role, isVerified.
 *
 * - `UserMeResponseDto` — full profile from `GET /users/me`:
 *   displayName, avatarUrl, bio, xpTotal, currentStreak, longestStreak,
 *   settings, createdAt, updatedAt.
 *
 * The two types are complementary: use `CurrentUserResponseDto` for auth
 * decisions and role checks; use `UserMeResponseDto` for profile display.
 */

export type {
  UserMeResponseDto,
  UpdateMeDto,
  UpdateMeSettingsDto,
} from "@/lib/api/generated/schemas";

export type {
  UserControllerMeResult,
  UserControllerUpdateMeResult,
  UserControllerUpdateMeSettingsResult,
} from "@/lib/api/generated/users/users";

// Re-export the domain types declared in `user-backend.ts`. This
// is the single source of truth for `Player`, `UserSettings`,
// etc. (Friend-related mock types — `FriendStats`, `FriendProfile`,
// `QuizInvitation`, `SocialState` — were removed in Phase 2 F-05/F-21
// when the localStorage `/friends` shim was replaced by the live
// social hooks. Consumers should use `SocialUserSummaryDto` and
// `SocialFriendRequestDto` from `features/social/types` instead.)
export type {
  CurrentUserResponse,
  EditProfileRequest,
  EditSettingsRequest,
  Player,
  NotificationPreferences,
  UserSettings,
  ConnectedAccount,
  UserSettingsTabId,
  Winner,
  Testimonial,
} from "./user-backend";

// ─── Epic 4.5 — Personal activity feed types ─────────────────────────────────────

export * from "./activity.types";
export * from "./badge.types";
export * from "./tournament.types";
export * from "./user-analytics.types";