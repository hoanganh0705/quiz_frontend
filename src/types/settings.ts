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

export const defaultSettings: UserSettings = {
  account: {
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    username: 'johndoe',
    avatarUrl: '/avatars/default.png'
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    quizReminders: true,
    friendRequests: true,
    challengeInvites: true,
    weeklyDigest: false,
    marketingEmails: false,
    achievementAlerts: true
  },
  privacy: {
    profileVisibility: 'public',
    showOnlineStatus: true,
    showQuizHistory: true,
    showAchievements: true,
    allowFriendRequests: true,
    showInLeaderboard: true,
    shareActivityWithFriends: true
  },
  locale: {
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  connectedAccounts: {
    google: {
      id: '1',
      email: 'john.doe@gmail.com',
      name: 'John Doe',
      connectedAt: '2024-01-15'
    },
    github: null,
    discord: null,
    twitter: null
  }
}

export const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'vi', label: 'Tiếng Việt' }
]

export const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City' },
  { value: 'Australia/Sydney', label: 'Sydney' }
]

export const dateFormats = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
]
