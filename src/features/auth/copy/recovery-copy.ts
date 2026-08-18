

const COPY: Readonly<Record<string, string>> = Object.freeze({

'forgot.loading': 'Sending…',
'forgot.idle.placeholder': 'Email address',
'forgot.idle.help': 'Send a password reset link to the address you used at sign-up.',
'forgot.acknowledgement.title': 'Check your inbox',
'forgot.acknowledgement.body':
'If the address you entered is eligible for a new link, you will receive an email shortly. You can close this tab — the link works on this device.',
'forgot.acknowledgement.openEmailLabel': 'Check your email on this device',
'forgot.error.rate_limited':
'Too many requests. Please wait a moment before trying again.',
'forgot.error.server':
'We could not send the email. Please try again — your details are still in the form.',
'forgot.cooldown.message':
'You can request another in {seconds}s.',

'reset.loading.title': 'Updating your password',
'reset.loading.body':
'Hang tight while we update your password. You can close this tab — the reset works once.',
'reset.invalid.title': 'This link is no longer valid',
'reset.invalid.body':
'Password reset links are single-use. If the link you opened is no longer recognised, you can request a new one below — the result above does not reveal which case applies.',
'reset.invalid.tryAgain': 'Try the link again',
'reset.invalid.forgotLabel': 'Request a new reset link',
'reset.invalid.loginLabel': 'Sign in',
'reset.success.title': 'Your password is updated',
'reset.success.body':
'If the link you opened was recognised, your password is now updated. We are signing you out and taking you to the sign-in page.',
'reset.error.validation':
'Please check the new password and try again. The form values are still in place.',
'reset.error.rate_limited':
'Too many requests. Please wait a moment before trying again.',
'reset.error.server':
'We could not update your password. Please try again — your details are still in the form.',
});

export const recoveryCopy = {
forgot: {
loading: COPY['forgot.loading'],
idle: {
placeholder: COPY['forgot.idle.placeholder'],
help: COPY['forgot.idle.help'],
    },
acknowledgement: {
title: COPY['forgot.acknowledgement.title'],
body: COPY['forgot.acknowledgement.body'],
openEmailLabel: COPY['forgot.acknowledgement.openEmailLabel'],
    },
error: {
rate_limited: COPY['forgot.error.rate_limited'],
server: COPY['forgot.error.server'],
    },
cooldown: {
message: COPY['forgot.cooldown.message'],
    },
  },
reset: {
loading: {
title: COPY['reset.loading.title'],
body: COPY['reset.loading.body'],
    },
invalid: {
title: COPY['reset.invalid.title'],
body: COPY['reset.invalid.body'],
tryAgain: COPY['reset.invalid.tryAgain'],
forgotLabel: COPY['reset.invalid.forgotLabel'],
loginLabel: COPY['reset.invalid.loginLabel'],
    },
success: {
title: COPY['reset.success.title'],
body: COPY['reset.success.body'],
    },
error: {
validation: COPY['reset.error.validation'],
rate_limited: COPY['reset.error.rate_limited'],
server: COPY['reset.error.server'],
    },
  },
} as const;

export const COPY_KEYS = {
forgot: {
loading: 'forgot.loading' as const,
idle: {
placeholder: 'forgot.idle.placeholder' as const,
help: 'forgot.idle.help' as const,
    },
acknowledgement: {
title: 'forgot.acknowledgement.title' as const,
body: 'forgot.acknowledgement.body' as const,
openEmailLabel: 'forgot.acknowledgement.openEmailLabel' as const,
    },
error: {
rate_limited: 'forgot.error.rate_limited' as const,
server: 'forgot.error.server' as const,
    },
cooldown: {
message: 'forgot.cooldown.message' as const,
    },
  },
reset: {
loading: {
title: 'reset.loading.title' as const,
body: 'reset.loading.body' as const,
    },
invalid: {
title: 'reset.invalid.title' as const,
body: 'reset.invalid.body' as const,
tryAgain: 'reset.invalid.tryAgain' as const,
forgotLabel: 'reset.invalid.forgotLabel' as const,
loginLabel: 'reset.invalid.loginLabel' as const,
    },
success: {
title: 'reset.success.title' as const,
body: 'reset.success.body' as const,
    },
error: {
validation: 'reset.error.validation' as const,
rate_limited: 'reset.error.rate_limited' as const,
server: 'reset.error.server' as const,
    },
  },
} as const;

export function resolveCopy(key: string): string {
return COPY[key] ?? '';
}

export function resolveCooldown(seconds: number): string {
const template = COPY['forgot.cooldown.message'];
const safe = Math.max(0, Math.floor(seconds));
return template.replace('{seconds}', String(safe));
}

export function forgotAcknowledgementSnapshot(): string {
return COPY['forgot.acknowledgement.body'];
}

export function resetInvalidSnapshot(): string {
return COPY['reset.invalid.body'];
}

export function resetSuccessSnapshot(): string {
return COPY['reset.success.body'];
}