/**
 * Users Types — aligned with backend UserMeResponseDto.
 */

// ─── Backend-aligned types ───────────────────────────────────────────────────────

export interface UserMeResponseDto {
  userId: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  xpTotal: number
  currentStreak: number
  longestStreak: number
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UpdateMeDto {
  displayName?: string
  bio?: string
}

export interface UpdateMeSettingsDto {
  settings: Record<string, unknown>
}

// ─── Legacy types (deprecated — for backward compat) ────────────────────────────

/** @deprecated Use UserMeResponseDto instead */
export interface CurrentUserResponse {
  userId: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  xpTotal: number
  currentStreak: number
  longestStreak: number
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** @deprecated Use UpdateMeDto instead */
export type EditProfileRequest = {
  displayName?: string
  bio?: string
}

/** @deprecated Use UpdateMeSettingsDto instead */
export type EditSettingsRequest = {
  settings: Record<string, unknown>
}

// ─── Frontend-only types (gamification - not in backend yet) ──────────────────

export interface Player {
  id: string
  rank: number
  name: string
  username?: string
  avatarUrl?: string
  country?: string
  flag?: string
  streak?: number
  score?: number
  level?: number
  levelString?: string
  quizzes?: number
  quizzesCreated?: number
  wins?: number
  badge?: string
  earned?: number
  followers?: string | number
  following?: string | number
  bgImageUrl?: string
  bio?: string
  joinedAt?: string
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
export interface FriendStats {
  quizzesPlayed: number
  averageScore: number
  winRate: number
  streak: number
}

export interface FriendProfile {
  id: number
  name: string
  username: string
  avatar: string
  onlineStatus: 'online' | 'offline' | 'away'
  stats: FriendStats
}

export interface QuizInvitation {
  id: string
  friendId: string | number
  friendName: string
  friendAvatar: string
  inviterId: string
  inviterName: string
  inviterAvatar: string
  quizId: string
  quizTitle: string
  sentAt: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface SocialState {
  friends: number[]
  incomingRequests: number[]
  outgoingRequests: number[]
  invitations: QuizInvitation[]
}

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
