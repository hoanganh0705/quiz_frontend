import type { UserSettings } from '@/features/users/types/user-backend'

export const languages: ReadonlyArray<{ value: string; label: string }> = [
{ value: 'en', label: 'English' },
{ value: 'vi', label: 'Tiếng Việt' },
{ value: 'es', label: 'Español' },
{ value: 'fr', label: 'Français' },
{ value: 'de', label: 'Deutsch' },
{ value: 'ja', label: '日本語' },
{ value: 'ko', label: '한국어' },
{ value: 'zh', label: '中文' },
]

export const timezones: ReadonlyArray<{ value: string; label: string }> = [
{ value: 'UTC', label: 'UTC' },
{ value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
{ value: 'America/Denver', label: 'Mountain Time (Denver)' },
{ value: 'America/Chicago', label: 'Central Time (Chicago)' },
{ value: 'America/New_York', label: 'Eastern Time (New York)' },
{ value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
{ value: 'Europe/London', label: 'London' },
{ value: 'Europe/Paris', label: 'Paris' },
{ value: 'Europe/Berlin', label: 'Berlin' },
{ value: 'Europe/Madrid', label: 'Madrid' },
{ value: 'Europe/Rome', label: 'Rome' },
{ value: 'Europe/Istanbul', label: 'Istanbul' },
{ value: 'Africa/Cairo', label: 'Cairo' },
{ value: 'Africa/Johannesburg', label: 'Johannesburg' },
{ value: 'Asia/Dubai', label: 'Dubai' },
{ value: 'Asia/Kolkata', label: 'India Standard Time (Kolkata)' },
{ value: 'Asia/Bangkok', label: 'Bangkok' },
{ value: 'Asia/Singapore', label: 'Singapore' },
{ value: 'Asia/Hong_Kong', label: 'Hong Kong' },
{ value: 'Asia/Shanghai', label: 'Shanghai' },
{ value: 'Asia/Tokyo', label: 'Tokyo' },
{ value: 'Asia/Seoul', label: 'Seoul' },
{ value: 'Australia/Sydney', label: 'Sydney' },
{ value: 'Pacific/Auckland', label: 'Auckland' },
]

export const dateFormats: ReadonlyArray<{ value: string; label: string }> = [
{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO 8601)' },
{ value: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g. 09 Aug 2026)' },
{ value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (e.g. Aug 09, 2026)' },
]

export const defaultSettings: UserSettings = {
account: {
email: '',
displayName: '',
username: '',
avatarUrl: '',
  },
notifications: {
emailNotifications: true,
pushNotifications: false,
quizReminders: true,
friendRequests: true,
challengeInvites: true,
weeklyDigest: false,
marketingEmails: false,
achievementAlerts: true,
  },
notificationChannels: {
inApp: true,
email: true,
push: false,
marketing: false,
  },
privacy: {
profileVisibility: 'public',
showOnlineStatus: true,
showQuizHistory: true,
showAchievements: true,
allowFriendRequests: true,
showInLeaderboard: true,
shareActivityWithFriends: true,
  },
locale: {
language: 'en',
timezone: typeof Intl !== 'undefined'
? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
: 'UTC',
dateFormat: 'MMM DD, YYYY',
timeFormat: '12h',
  },
connectedAccounts: {
google: null,
github: null,
discord: null,
twitter: null,
  },
}