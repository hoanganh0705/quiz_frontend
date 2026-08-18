

const VERIFY: Record<string, string> = {
'verify.title': 'Confirm your password',
'verify.body':
'Enter your current password to continue. This step proves it is you before we make a change to your account.',
'verify.fieldLabel': 'Current password',
'verify.fieldPlaceholder': 'Enter your current password',
'verify.submit': 'Continue',
'verify.cancel': 'Cancel',
'verify.reveal': 'Show password',
'verify.hide': 'Hide password',
};

const CHANGE_PASSWORD: Record<string, string> = {
'changePassword.title': 'Change password',
'changePassword.subtitle':
'Choose a new password for your account. You will stay signed in on this device, but every other session will be signed out.',
'changePassword.currentLabel': 'Current password',
'changePassword.currentPlaceholder': 'Enter your current password',
'changePassword.newLabel': 'New password',
'changePassword.newPlaceholder': 'Enter a new password',
'changePassword.confirmLabel': 'Confirm new password',
'changePassword.confirmPlaceholder': 'Re-enter your new password',
'changePassword.submit': 'Change password',
'changePassword.cancel': 'Cancel',
'changePassword.success': 'Password updated. Other sessions have been signed out.',
'changePassword.reveal': 'Show password',
'changePassword.hide': 'Hide password',
'changePassword.forgotLink': 'Forgot your password?',
'changePassword.sectionHeading': 'Change password',
};

const CHANGE_PASSWORD_ERRORS: Record<string, string> = {
'changePassword.errors.invalidCurrent': 'Current password is incorrect',
'changePassword.errors.reuse':
'Choose a password you haven’t used before',
'changePassword.errors.mismatch': 'Passwords do not match',
'changePassword.errors.weak': 'Choose a stronger password',
'changePassword.errors.equalToCurrent':
'Your new password must be different from your current password',
'changePassword.errors.required': 'This field is required',
'changePassword.errors.tooShort': 'Use at least 8 characters',
};

const CHANGE_PASSWORD_BANNER: Record<string, string> = {
'changePassword.error.generic':
'We could not change your password. Please try again.',
'changePassword.error.conflict':
'This account cannot change its password here. Use the recovery link below to set one up.',
'changePassword.error.retryable':
'We could not change your password. Please try again.',
'changePassword.error.authTerminal':
'Your session has expired. Please sign in again.',
};

const VERIFY_BANNER: Record<string, string> = {
'verify.error.generic':
'We could not confirm your password. Please try again.',
'verify.error.invalidCurrent': 'Current password is incorrect',
'verify.error.retryable':
'We could not confirm your password. Please try again.',
'verify.error.authTerminal':
'Your session has expired. Please sign in again.',
};

const CHANGE_PASSWORD_STRENGTH: Record<string, string> = {
'changePassword.strength.heading': 'Password strength',
'changePassword.strength.tooWeak': 'Too weak',
'changePassword.strength.weak': 'Weak',
'changePassword.strength.fair': 'Fair',
'changePassword.strength.good': 'Good',
'changePassword.strength.strong': 'Strong',
'changePassword.strength.requirements':
'Use at least 8 characters, with uppercase, numbers, and symbols.',
};

const REVALIDATION: Record<string, string> = {
'changePassword.revalidation.refreshing':
'Refreshing your security summary…',
'changePassword.revalidation.failed':
'Your password was changed, but we could not refresh the summary. Reload the page to see the updated state.',
};

const COPY: Record<string, string> = {
...VERIFY,
...CHANGE_PASSWORD,
...CHANGE_PASSWORD_ERRORS,
...CHANGE_PASSWORD_BANNER,
...VERIFY_BANNER,
...CHANGE_PASSWORD_STRENGTH,
...REVALIDATION,
};

export const COPY_KEYS = {
password: {
verify: {
title: 'verify.title' as const,
body: 'verify.body' as const,
fieldLabel: 'verify.fieldLabel' as const,
fieldPlaceholder: 'verify.fieldPlaceholder' as const,
submit: 'verify.submit' as const,
cancel: 'verify.cancel' as const,
reveal: 'verify.reveal' as const,
hide: 'verify.hide' as const,
    },
changePassword: {
title: 'changePassword.title' as const,
subtitle: 'changePassword.subtitle' as const,
sectionHeading: 'changePassword.sectionHeading' as const,
currentLabel: 'changePassword.currentLabel' as const,
currentPlaceholder: 'changePassword.currentPlaceholder' as const,
newLabel: 'changePassword.newLabel' as const,
newPlaceholder: 'changePassword.newPlaceholder' as const,
confirmLabel: 'changePassword.confirmLabel' as const,
confirmPlaceholder: 'changePassword.confirmPlaceholder' as const,
submit: 'changePassword.submit' as const,
cancel: 'changePassword.cancel' as const,
success: 'changePassword.success' as const,
reveal: 'changePassword.reveal' as const,
hide: 'changePassword.hide' as const,
forgotLink: 'changePassword.forgotLink' as const,
    },
errors: {
invalidCurrent: 'changePassword.errors.invalidCurrent' as const,
reuse: 'changePassword.errors.reuse' as const,
mismatch: 'changePassword.errors.mismatch' as const,
weak: 'changePassword.errors.weak' as const,
equalToCurrent: 'changePassword.errors.equalToCurrent' as const,
required: 'changePassword.errors.required' as const,
tooShort: 'changePassword.errors.tooShort' as const,
    },
error: {
generic: 'changePassword.error.generic' as const,
conflict: 'changePassword.error.conflict' as const,
retryable: 'changePassword.error.retryable' as const,
authTerminal: 'changePassword.error.authTerminal' as const,
    },
verifyError: {
generic: 'verify.error.generic' as const,
invalidCurrent: 'verify.error.invalidCurrent' as const,
retryable: 'verify.error.retryable' as const,
authTerminal: 'verify.error.authTerminal' as const,
    },
strength: {
heading: 'changePassword.strength.heading' as const,
tooWeak: 'changePassword.strength.tooWeak' as const,
weak: 'changePassword.strength.weak' as const,
fair: 'changePassword.strength.fair' as const,
good: 'changePassword.strength.good' as const,
strong: 'changePassword.strength.strong' as const,
requirements: 'changePassword.strength.requirements' as const,
    },
revalidation: {
refreshing: 'changePassword.revalidation.refreshing' as const,
failed: 'changePassword.revalidation.failed' as const,
    },
  },
} as const;

export function resolveCopy(key: string): string {
return COPY[key] ?? '';
}

export function verifyInvalidCurrentSnapshot(): string {
return COPY['verify.error.invalidCurrent'];
}

export function passwordTooWeakSnapshot(): string {
return COPY['changePassword.errors.weak'];
}

export function passwordChangeSuccessSnapshot(): string {
return COPY['changePassword.success'];
}

export function hasPasswordCopyKey(key: string): boolean {
return Object.prototype.hasOwnProperty.call(COPY, key);
}
