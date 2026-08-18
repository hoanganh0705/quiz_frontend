

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

export type CurrentUserResponse = UserMeResponseDto

export type EditProfileRequest = UpdateMeDto

export type EditSettingsRequest = UpdateMeSettingsDto

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

export type UserSettingsTabId =
| 'account'
  | 'notifications'
  | 'privacy'
  | 'language'
  | 'connected'
  | 'connections'
  | 'danger'

export interface Winner {
id: string
name: string
avatarUrl: string
timeAgo: string
amountWon: string
game: string
}

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
