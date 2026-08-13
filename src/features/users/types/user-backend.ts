/**
 * Users Types — aligned with backend UserMeResponseDto.
 */

// ─── Backend-aligned types ───────────────────────────────────────────────────────

// The canonical `UserMeResponseDto` lives in the SDK barrel
// (`@/lib/api/generated/schemas`). Re-exporting it here is the
// documented Phase 1 action — historic callers that imported
// `UserMeResponseDto` from `@/features/users/types/user-backend`
// now receive the same shape. The previous in-file declaration was
// a structural duplicate that created a TS2322 latent bug whenever
// SDK-typed code (`useUserStore.setUser`) and user-backend-typed
// code (`useMyProfile.profile`) exchanged the type.
import type {
  UserMeResponseDto,
  UpdateMeDto,
  UpdateMeSettingsDto,
} from "@/lib/api/generated/schemas";

export type {
  UserMeResponseDto,
  UpdateMeDto,
  UpdateMeSettingsDto,
};

// ─── Legacy types (deprecated — for backward compat) ────────────────────────────

/**
 * @deprecated Use UserMeResponseDto (the SDK shape) instead. The
 * legacy declaration was a structural duplicate of the SDK type
 * with subtly different nullability (`string | null` vs optional).
 * Historic consumers were already using either interchangeably;
 * Phase 1 unifies them so SDK-typed code (e.g. `useUserStore`) and
 * user-backend-typed code (e.g. `useMyProfile.profile`) agree.
 */
export type CurrentUserResponse = UserMeResponseDto

/**
 * @deprecated Use UpdateMeDto (the SDK shape) instead.
 */
export type EditProfileRequest = UpdateMeDto

/**
 * @deprecated Use UpdateMeSettingsDto (the SDK shape) instead.
 */
export type EditSettingsRequest = UpdateMeSettingsDto

// ─── Frontend-only types (gamification - not in backend yet) ──────────────────

/**
 * `Player` — reduced projection consumed by the leaderboard card.
 *
 * Phase 6 (W-17): the historic `Player` type carried `bgImageUrl`,
 * `flag`, `country`, `joinedAt`, `bio`, `quizzes`, `quizzesCreated`,
 * `wins` — fields that were never populated by any backend endpoint.
 *
 * The narrower projection here is the only one the carousel
 * (`PlayerCard`) actually consumes. The legacy `ProfileHeader`
 * component still renders the deprecated fields; it sources them
 * from the live profile bundle (`useUserProfileBundle`) rather than
 * the `Player` projection. See `ProfileHeader` for the bundle-fed
 * shape.
 */
export interface Player {
  id: string
  rank: number
  name: string
  avatarUrl?: string | null
  streak?: number
  score?: number
  level?: number
  levelString?: string
  badge?: string
  earned?: number
  followers?: string | number
  following?: string | number
}

// User settings types
export interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  quizReminders: boolean
  friendActivity: boolean
  leaderboardUpdates: boolean
  weeklyDigest: boolean
}

export interface UserSettings {
  account: {
    email: string
    displayName: string
    username: string
    avatarUrl: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    quizReminders: boolean
    friendRequests: boolean
    challengeInvites: boolean
    weeklyDigest: boolean
    marketingEmails: boolean
    achievementAlerts: boolean
  }
  notificationChannels: {
    inApp: boolean
    email: boolean
    push: boolean
    marketing: boolean
  }
  privacy: {
    profileVisibility: string
    showOnlineStatus: boolean
    showQuizHistory: boolean
    showAchievements: boolean
    allowFriendRequests: boolean
    showInLeaderboard: boolean
    shareActivityWithFriends: boolean
  }
  locale: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: string
  }
  connectedAccounts: {
    google: ConnectedAccount | null
    github: ConnectedAccount | null
    discord: ConnectedAccount | null
    twitter: ConnectedAccount | null
  }
}

export interface ConnectedAccount {
  id: string
  email: string
  name: string
  connectedAt: string
}

// Friend-related types
// REMOVED 2026-08-09 (Phase 2 F-05/F-21): the following mock-only
// types are no longer referenced by the new `/friends` page.
// `FriendStats`, `FriendProfile`, `QuizInvitation`, `SocialState`
// were defined to back the deleted `features/users/constants/friends.ts`
// localStorage shim. The new page consumes the live `SocialUserSummaryDto`
// and `SocialFriendRequestDto` from `features/social/types` and the
// read hooks from `features/social/hooks`. Reintroduce them only if
// a non-mock surface requires them.

export type UserSettingsTabId =
  | 'account'
  | 'notifications'
  | 'privacy'
  | 'language'
  | 'connected'
  | 'connections'
  | 'danger'

// Winner type for leaderboard
export interface Winner {
  id: string
  name: string
  avatarUrl: string
  timeAgo: string
  amountWon: string
  game: string
}

// Testimonial type for social proof
export interface Testimonial {
  id: string | number
  name: string
  role: string
  avatar: string
  quote: string
  earnings?: string
  quizzes?: string
  followers?: string
  rating: number
}
