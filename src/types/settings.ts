export interface UserSettings {
  // Account Settings
  account: {
    email: string
    displayName: string
    username: string
    avatarUrl: string
  }

  // Notification Preferences
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

  // Privacy Settings
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private'
    showOnlineStatus: boolean
    showQuizHistory: boolean
    showAchievements: boolean
    allowFriendRequests: boolean
    showInLeaderboard: boolean
    shareActivityWithFriends: boolean
  }

  // Language/Locale Preferences
  locale: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
  }

  // Connected Accounts
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

export type SettingsTab =
  | 'account'
  | 'notifications'
  | 'privacy'
  | 'language'
  | 'connections'
  | 'danger'
