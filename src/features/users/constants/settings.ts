import type { UserSettings } from '@/features/users/types/user-backend'

/**
 * Frontend-side constants for the user-settings domain.
 *
 * ## Why this file lives here
 *
 * `UserSettings` describes the *shape* of the user's settings payload
 * (mirroring `UpdateMeSettingsDto` from the backend). This file
 * provides the *default values* used when no user is signed in or
 * when a new user has not yet completed the onboarding step, plus
 * the canonical lists of choices surfaced in the Settings UI
 * (`LanguageSettings`, `PrivacySettings`, etc.).
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source epic: Epic 4.4 — User settings UI.
 *
 * ## Why this file was missing
 *
 * Phase 2 (F-05/F-21) deleted the entire
 * `features/users/constants/friends.ts` mock file together with the
 * directory it lived in. That delete was wider than it should have
 * been: the unrelated `features/users/constants/settings.ts` file
 * (which contains NO friend-related state) was collateral damage and
 * took `useAppLanguage` and `LanguageSettings` down with it. This
 * file is the restoration.
 */

/**
 * Static list of UI languages. Mirrors the `i18n.locales` block the
 * `useAppLanguage` hook reads (`en`, `vi`) plus the wider set the
 * Settings UI exposes as choices. The first two entries are
 * guaranteed to exist in the runtime translations table; the rest
 * fall back to English labels in the UI until they are wired up.
 */
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

/**
 * Common IANA timezones surfaced in the Settings UI. The list is
 * intentionally a curated subset (not every zone) — it covers the
 * regions where the largest share of users live and uses
 * `Intl.DateTimeFormat` for canonical labels.
 */
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

/**
 * Date-format options surfaced in the Settings UI. `value` is what
 * is stored; `label` is what the user sees. The locale column hints
 * the user at which format is conventional in each region.
 */
export const dateFormats: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO 8601)' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g. 09 Aug 2026)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (e.g. Aug 09, 2026)' },
]

/**
 * Default `UserSettings` used when:
 *   - no user is signed in (read by `useAppLanguage` for the public
 *     marketing pages — see `AppHeader`), or
 *   - a freshly-signed-up user has not yet saved their own settings
 *     via `PATCH /users/me/settings`.
 *
 * Every field is set so consumers can rely on a complete, well-typed
 * object without optional chaining. The `language` matches the
 * fallback language of `useAppLanguage`'s translation table so the
 * first paint is never empty.
 */
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