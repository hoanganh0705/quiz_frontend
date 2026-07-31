/**
 * Security dashboard & session-management copy registry.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T3.
 *
 * ## Purpose
 *
 * Every string the Security settings view (`/settings/security`) can
 * render is sourced from this registry, keyed by a stable `COPY_KEYS.security.*`
 * path. The view never renders a raw backend message — every visible
 * phrase resolves through here.
 *
 * ## Anti-leak guarantees
 *
 * Two classes of leak must never appear in this registry:
 *
 *  1. **Account-existence disclosure.** Unlike the public forms in
 *     Epic 2.1–2.3, the Security view is fully authenticated, so the
 *     threat model is different — the user already has the account.
 *     The leak that matters here is "session ownership" (i.e. telling
 *     an attacker whether `sessionId X` belongs to them).
 *
 *  2. **Session-ownership disclosure.** The
 *     `AUTH_SESSION_NOT_FOUND` path must NOT surface copy that says
 *     "that session was not yours" or "this session is for account
 *     Y". The mapper (`session-error-mapper.ts`) collapses every
 *     such failure to `'already_revoked'` (silent revalidate), so the
 *     banners here describe the operation ("we couldn't revoke this
 *     session") rather than the cause ("you don't own this row").
 *
 * ## Null-fallback discipline
 *
 * `AccountSecurityDto.lastPasswordChangeAt` and `passwordAgeDays` may
 * both be null. The UI must render a *neutral* fallback
 * ("Never changed" / "Not available"), never a numeric zero. The
 * `dashboard.passwordAge.unknown` key carries that contract.
 */

/**
 * Dashboard summary copy (US-2.8.1).
 */
const DASHBOARD = {
  title: 'Security',
  subtitle: 'Account verification, password metadata, and active sessions.',
  emailVerified: {
    label: 'Email verification',
    verified: 'Verified',
    unverified: 'Not verified',
  },
  activeSessionCount: {
    label: 'Active sessions',
    singular: '1 device',
    plural: (n: number) => `${n} devices`,
  },
  lastLogin: {
    label: 'Last successful sign-in',
    unknown: 'No sign-ins recorded yet',
  },
  passwordAge: {
    label: 'Password age',
    unknown: 'Never changed',
    daysSingular: '1 day',
    daysPlural: (n: number) => `${n} days`,
    notAvailable: 'Not available',
  },
  error: {
    loadFailed: {
      title: 'Unable to load security summary',
      body: 'We could not load your security summary. Please try again.',
    },
  },
} as const;

/**
 * Session list copy (US-2.8.2).
 *
 * The null-fallback strings cover the case where the backend omits a
 * device field for privacy or because user-agent parsing failed.
 */
const SESSION_LIST = {
  title: 'Active sessions',
  subtitle: 'Devices and browsers currently signed in to your account.',
  currentBadge: 'This device',
  deviceFallback: 'Unknown device',
  browserFallback: 'Unknown browser',
  osFallback: 'Unknown OS',
  ipFallback: 'Unknown IP',
  emptyState: 'No other active sessions.',
  revokedSuccess: 'Session revoked.',
  revokeOthersSuccess: 'Other sessions revoked.',
  error: {
    listFailed: {
      title: 'Unable to load sessions',
      body: 'We could not load your active sessions. Please try again.',
    },
    revokeFailed: {
      title: 'Could not revoke session',
      body: 'Something went wrong while revoking this session. Please try again.',
    },
    revokeOthersFailed: {
      title: 'Could not revoke other sessions',
      body: 'Something went wrong while revoking other sessions. Your current session is still active.',
    },
    conflict: {
      title: 'Could not revoke session',
      body: 'This session could not be revoked because of a conflict. Please refresh and try again.',
    },
  },
} as const;

/**
 * Revocation confirmation copy.
 *
 * All three flows (`single`, `others`, `all`) require explicit
 * confirmation via a modal before the network call fires. The body
 * copy is deliberately phrased in terms of the *action* the user is
 * about to take, not in terms of the session state — that prevents
 * the modal from leaking ownership detail.
 */
const REVOKE = {
  single: {
    title: 'Revoke this session?',
    body: 'That device or browser will be signed out immediately. You will need to sign in again on that device.',
    confirm: 'Revoke session',
    cancel: 'Cancel',
  },
  others: {
    title: 'Revoke all other sessions?',
    body: 'Every other device or browser signed in to your account will be signed out. You will stay signed in here.',
    confirm: 'Revoke other sessions',
    cancel: 'Cancel',
  },
  all: {
    title: 'Sign out everywhere?',
    body: 'Every device and browser — including this one — will be signed out. You will need to sign in again.',
    confirm: 'Sign out everywhere',
    cancel: 'Cancel',
  },
} as const;

/**
 * Logout-all confirmation copy (alias for `revoke.all`).
 *
 * Surfaced under a separate alias because the existing
 * `DangerZone` button copy ("Sign Out All Sessions") does not match
 * the dashboard's vocabulary. Keeping the alias lets both surfaces
 * share the same registry without an awkward rename.
 */
const LOGOUT_ALL = {
  title: 'Sign out everywhere?',
  body: 'Every device and browser — including this one — will be signed out. You will need to sign in again.',
  confirm: 'Sign out everywhere',
  cancel: 'Cancel',
  pending: 'Signing out...',
  success: 'Signed out everywhere.',
  error: {
    failed: {
      title: 'Could not sign out everywhere',
      body: 'Something went wrong. Some sessions may still be active.',
    },
  },
} as const;

const COPY = {
  dashboard: DASHBOARD,
  sessionList: SESSION_LIST,
  revoke: REVOKE,
  logoutAll: LOGOUT_ALL,
} as const;

/**
 * Stable key paths for every copy slot.
 *
 * Components import the registry with a single path; the key path
 * itself is the contract. This mirrors the `login-copy.ts` pattern
 * where `COPY_KEYS` is the public re-export surface.
 *
 * Usage:
 *   import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/security-copy';
 *   <h1>{resolveCopy(COPY_KEYS.dashboard.title)}</h1>
 */
export const COPY_KEYS = COPY;

/**
 * Identity resolver for the registry. Returns the string the key
 * points at. Kept as a thin function so a future move to i18n is a
 * one-file change.
 */
export function resolveCopy(key: string): string {
  return key;
}

/**
 * Snapshot helper: the exact byte sequence the dashboard renders when
 * `passwordAgeDays` is null. The unit suite (planned for 2.8.T27)
 * asserts the rendered string matches this byte sequence.
 *
 * Contract: null must never render as `"0"` or `"0 days"`.
 */
export function passwordAgeUnknownSnapshot(): string {
  return DASHBOARD.passwordAge.unknown;
}

/**
 * Snapshot helper: the exact byte sequence the active-session list
 * renders when the only session is the current one.
 */
export function sessionListEmptySnapshot(): string {
  return SESSION_LIST.emptyState;
}

/**
 * Snapshot helper: the exact byte sequence the dashboard renders when
 * `lastPasswordChangeAt` is null.
 */
export function lastPasswordChangeUnknownSnapshot(): string {
  return DASHBOARD.passwordAge.unknown;
}
