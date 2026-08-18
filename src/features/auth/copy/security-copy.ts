

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

export const COPY_KEYS = COPY;

export function resolveCopy(key: string): string {
return key;
}

export function passwordAgeUnknownSnapshot(): string {
return DASHBOARD.passwordAge.unknown;
}

export function sessionListEmptySnapshot(): string {
return SESSION_LIST.emptyState;
}

export function lastPasswordChangeUnknownSnapshot(): string {
return DASHBOARD.passwordAge.unknown;
}
