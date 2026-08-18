

const CONFIRM: Record<string, string> = {
'confirm.title': 'Delete your account?',
'confirm.body':
'This permanently deletes your account, profile, and saved data. Other devices signed in to this account will be signed out immediately. This cannot be undone.',
'confirm.consequenceHeading': 'What gets deleted',
'confirm.consequence.body':
'Your profile, your quizzes, your bookmarks, your activity history, and every active session will be removed. The refresh-token cookie will be cleared.',
};

const TYPED: Record<string, string> = {
'typed.label':
'Type DELETE to confirm',
'typed.placeholder': 'DELETE',
'typed.hint':
'Enter the word DELETE in capital letters to confirm.',
};

const PASSWORD: Record<string, string> = {
'password.label': 'Current password',
'password.placeholder': 'Enter your current password',
'password.reveal': 'Show password',
'password.hide': 'Hide password',
};

const ACTIONS: Record<string, string> = {
'actions.submit': 'Permanently delete my account',
'actions.cancel': 'Cancel',
'actions.submitPending': 'Deleting your account…',
'actions.cleanupPending': 'Signing you out everywhere…',
};

const CLEANUP: Record<string, string> = {
'cleanup.heading': 'Your account is being deleted',
'cleanup.body':
'We are clearing your local data and signing you out of every device. You will be redirected to the public homepage shortly.',
};

const ERRORS_INVALID_CURRENT: Record<string, string> = {
'errors.invalidCurrent.field': 'Current password is incorrect',
'errors.invalidCurrent.banner':
'We could not confirm your password. Please try again.',
};

const ERRORS_CONFLICT: Record<string, string> = {
'errors.conflict.banner':
'We could not delete your account right now. We need to check your account state before you try again.',
'errors.conflict.revalidateCta': 'Re-check account state',
};

const ERRORS_NOT_FOUND: Record<string, string> = {
'errors.notFound.banner':
'Your account is no longer available. You are being signed out.',
};

const ERRORS_UNCERTAIN: Record<string, string> = {
'errors.uncertain.banner':
'We could not confirm whether your account was deleted. Please re-check before trying again.',
'errors.uncertain.revalidateCta': 'Re-check account state',
};

const ERRORS_AUTH_TERMINAL: Record<string, string> = {
'errors.authTerminal.banner':
'Your session has expired. Please sign in again.',
};

const ERRORS_VALIDATION: Record<string, string> = {
'errors.validation.emptyPassword':
'Enter your current password to continue.',
'errors.validation.banner':
'Please correct the highlighted fields and try again.',
};

const PUBLIC_LANDING: Record<string, string> = {
'publicLanding.notice':
'Your account has been deleted. Sign up again any time.',
};

const COPY: Record<string, string> = {
...CONFIRM,
...TYPED,
...PASSWORD,
...ACTIONS,
...CLEANUP,
...ERRORS_INVALID_CURRENT,
...ERRORS_CONFLICT,
...ERRORS_NOT_FOUND,
...ERRORS_UNCERTAIN,
...ERRORS_AUTH_TERMINAL,
...ERRORS_VALIDATION,
...PUBLIC_LANDING,
};

export const COPY_KEYS = {
deletion: {
confirm: {
title: 'confirm.title' as const,
body: 'confirm.body' as const,
consequenceHeading: 'confirm.consequenceHeading' as const,
consequenceBody: 'confirm.consequence.body' as const,
    },
typed: {
label: 'typed.label' as const,
placeholder: 'typed.placeholder' as const,
hint: 'typed.hint' as const,
    },
password: {
label: 'password.label' as const,
placeholder: 'password.placeholder' as const,
reveal: 'password.reveal' as const,
hide: 'password.hide' as const,
    },
actions: {
submit: 'actions.submit' as const,
cancel: 'actions.cancel' as const,
submitPending: 'actions.submitPending' as const,
cleanupPending: 'actions.cleanupPending' as const,
    },
cleanup: {
heading: 'cleanup.heading' as const,
body: 'cleanup.body' as const,
    },
errors: {
invalidCurrentField: 'errors.invalidCurrent.field' as const,
invalidCurrentBanner: 'errors.invalidCurrent.banner' as const,
conflictBanner: 'errors.conflict.banner' as const,
conflictRevalidateCta: 'errors.conflict.revalidateCta' as const,
notFoundBanner: 'errors.notFound.banner' as const,
uncertainBanner: 'errors.uncertain.banner' as const,
uncertainRevalidateCta: 'errors.uncertain.revalidateCta' as const,
authTerminalBanner: 'errors.authTerminal.banner' as const,
validationEmptyPassword: 'errors.validation.emptyPassword' as const,
validationBanner: 'errors.validation.banner' as const,
    },
publicLanding: {
notice: 'publicLanding.notice' as const,
    },
  },
} as const;

export function resolveCopy(key: string): string {
return COPY[key] ?? '';
}

export function deletionConfirmTitleSnapshot(): string {
return COPY['confirm.title'];
}

export function deletionConsequenceSnapshot(): string {
return COPY['confirm.body'];
}

export function deletionUncertainSnapshot(): string {
return COPY['errors.uncertain.banner'];
}

export function hasDeletionCopyKey(key: string): boolean {
return Object.prototype.hasOwnProperty.call(COPY, key);
}
