

const COPY: Readonly<Record<string, string>> = Object.freeze({

'availability.checking': 'Checking…',
'availability.available': 'Available',
'availability.unavailable': 'Not available',
'availability.rate_limited':
'Too many checks. You can still submit — we will confirm everything by email.',
'availability.server':
'We cannot check right now. You can still submit — we will confirm by email.',
'availability.silent': '',

'form.username.label': 'Username',
'form.username.placeholder':
'Letters, numbers, periods, underscores, hyphens',
'form.username.help':
'3–50 characters. Letters, numbers, periods, underscores, hyphens.',
'form.email.label': 'Email',
'form.email.placeholder': 'you@example.com',
'form.email.help': 'We will email you a verification link.',
'form.password.label': 'Password',
'form.password.placeholder': 'At least 6 characters',
'form.password.help':
'6–100 characters, with at least one uppercase letter, one number, and one symbol.',
'form.passwordConfirmation.label': 'Confirm password',
'form.passwordConfirmation.placeholder': 'Type your password again',
'form.passwordConfirmation.help': 'Re-enter the password above.',

'submit.acknowledgement.title': 'Check your inbox',
'submit.acknowledgement.body':
'If the address you entered is eligible for a new account, you will receive an email with a verification link shortly. You can close this tab — the link works on this device.',
'submit.acknowledgement.action':
'Open your email and click the verification link to continue.',
'submit.acknowledgement.resendLabel':
'Did not get an email? Request another',
'submit.acknowledgement.loginLabel': 'Verified? Sign in',

'submit.error.validation':
'Please correct the highlighted fields and try again.',
'submit.error.rate_limited':
'Too many requests. Please wait a moment before trying again.',
'submit.error.server':
'We could not reach the server. Please try again — your details are still in the form.',
'submit.error.forbidden':
'We could not complete that step. Please refresh and try again.',
'submit.error.globalFallback': 'Something went wrong. Please try again.',
});

export const registrationCopy = {
availability: {
checking: COPY['availability.checking'],
available: COPY['availability.available'],
unavailable: COPY['availability.unavailable'],
rate_limited: COPY['availability.rate_limited'],
server: COPY['availability.server'],
silent: COPY['availability.silent'],
  },
form: {
username: {
label: COPY['form.username.label'],
placeholder: COPY['form.username.placeholder'],
help: COPY['form.username.help'],
    },
email: {
label: COPY['form.email.label'],
placeholder: COPY['form.email.placeholder'],
help: COPY['form.email.help'],
    },
password: {
label: COPY['form.password.label'],
placeholder: COPY['form.password.placeholder'],
help: COPY['form.password.help'],
    },
passwordConfirmation: {
label: COPY['form.passwordConfirmation.label'],
placeholder: COPY['form.passwordConfirmation.placeholder'],
help: COPY['form.passwordConfirmation.help'],
    },
  },
submit: {
acknowledgement: {
title: COPY['submit.acknowledgement.title'],
body: COPY['submit.acknowledgement.body'],
action: COPY['submit.acknowledgement.action'],
resendLabel: COPY['submit.acknowledgement.resendLabel'],
loginLabel: COPY['submit.acknowledgement.loginLabel'],
    },
error: {
validation: COPY['submit.error.validation'],
rate_limited: COPY['submit.error.rate_limited'],
server: COPY['submit.error.server'],
forbidden: COPY['submit.error.forbidden'],
globalFallback: COPY['submit.error.globalFallback'],
    },
  },
} as const;

export const COPY_KEYS = {
availability: {
checking: 'availability.checking' as const,
available: 'availability.available' as const,
unavailable: 'availability.unavailable' as const,
rate_limited: 'availability.rate_limited' as const,
server: 'availability.server' as const,
silent: 'availability.silent' as const,
  },
form: {
username: {
label: 'form.username.label' as const,
placeholder: 'form.username.placeholder' as const,
help: 'form.username.help' as const,
    },
email: {
label: 'form.email.label' as const,
placeholder: 'form.email.placeholder' as const,
help: 'form.email.help' as const,
    },
password: {
label: 'form.password.label' as const,
placeholder: 'form.password.placeholder' as const,
help: 'form.password.help' as const,
    },
passwordConfirmation: {
label: 'form.passwordConfirmation.label' as const,
placeholder: 'form.passwordConfirmation.placeholder' as const,
help: 'form.passwordConfirmation.help' as const,
    },
  },
submit: {
acknowledgement: {
title: 'submit.acknowledgement.title' as const,
body: 'submit.acknowledgement.body' as const,
action: 'submit.acknowledgement.action' as const,
resendLabel: 'submit.acknowledgement.resendLabel' as const,
loginLabel: 'submit.acknowledgement.loginLabel' as const,
    },
error: {
validation: 'submit.error.validation' as const,
rate_limited: 'submit.error.rate_limited' as const,
server: 'submit.error.server' as const,
forbidden: 'submit.error.forbidden' as const,
globalFallback: 'submit.error.globalFallback' as const,
    },
  },
} as const;

export function resolveCopy(key: string): string {
return COPY[key] ?? '';
}

export function acknowledgementBodySnapshot(): string {
return COPY['submit.acknowledgement.body'];
}
