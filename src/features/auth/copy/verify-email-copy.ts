

const COPY: Readonly<Record<string, string>> = Object.freeze({

'verify.loading.title': 'Verifying your email',
'verify.loading.body':
'Hang tight while we confirm your email address. You can close this tab — the link works once.',
'verify.acknowledgement.title': 'Check your inbox',
'verify.acknowledgement.body':
'If the link you opened is recognised, you can now sign in. If not, request a new link below — the result above does not reveal which case applies.',
'verify.acknowledgement.action':
'Open your email and click the verification link to continue.',
'verify.invalid.title': 'Check your inbox',

'verify.invalid.body':
'If the link you opened is recognised, you can now sign in. If not, request a new link below — the result above does not reveal which case applies.',
'verify.invalid.tryAgain': 'Try the link again',
'verify.invalid.resendLabel': 'Request a new verification link',
'verify.invalid.loginLabel': 'Sign in',

'resend.loading': 'Sending…',
'resend.idle.placeholder': 'Email address',
'resend.idle.help': 'Send a new verification link to the address you used at sign-up.',
'resend.acknowledgement.title': 'Check your inbox',
'resend.acknowledgement.body':
'If the address you entered is eligible for a new link, you will receive an email shortly. You can close this tab — the link works on this device.',
'resend.error.rate_limited':
'Too many requests. Please wait a moment before trying again.',
'resend.error.server':
'We could not send the email. Please try again — your details are still in the form.',
'resend.cooldown.message':
'A new email was just sent. You can request another in {seconds}s.',
});

export const verifyEmailCopy = {
verify: {
loading: {
title: COPY['verify.loading.title'],
body: COPY['verify.loading.body'],
    },
acknowledgement: {
title: COPY['verify.acknowledgement.title'],
body: COPY['verify.acknowledgement.body'],
action: COPY['verify.acknowledgement.action'],
    },
invalid: {
title: COPY['verify.invalid.title'],
body: COPY['verify.invalid.body'],
tryAgain: COPY['verify.invalid.tryAgain'],
resendLabel: COPY['verify.invalid.resendLabel'],
loginLabel: COPY['verify.invalid.loginLabel'],
    },
  },
resend: {
loading: COPY['resend.loading'],
idle: {
placeholder: COPY['resend.idle.placeholder'],
help: COPY['resend.idle.help'],
    },
acknowledgement: {
title: COPY['resend.acknowledgement.title'],
body: COPY['resend.acknowledgement.body'],
    },
error: {
rate_limited: COPY['resend.error.rate_limited'],
server: COPY['resend.error.server'],
    },
cooldown: {
message: COPY['resend.cooldown.message'],
    },
  },
} as const;

export const COPY_KEYS = {
verify: {
loading: {
title: 'verify.loading.title' as const,
body: 'verify.loading.body' as const,
    },
acknowledgement: {
title: 'verify.acknowledgement.title' as const,
body: 'verify.acknowledgement.body' as const,
action: 'verify.acknowledgement.action' as const,
    },
invalid: {
title: 'verify.invalid.title' as const,
body: 'verify.invalid.body' as const,
tryAgain: 'verify.invalid.tryAgain' as const,
resendLabel: 'verify.invalid.resendLabel' as const,
loginLabel: 'verify.invalid.loginLabel' as const,
    },
  },
resend: {
loading: 'resend.loading' as const,
idle: {
placeholder: 'resend.idle.placeholder' as const,
help: 'resend.idle.help' as const,
    },
acknowledgement: {
title: 'resend.acknowledgement.title' as const,
body: 'resend.acknowledgement.body' as const,
    },
error: {
rate_limited: 'resend.error.rate_limited' as const,
server: 'resend.error.server' as const,
    },
cooldown: {
message: 'resend.cooldown.message' as const,
    },
  },
} as const;

export function resolveCopy(key: string): string {
return COPY[key] ?? '';
}

export function resolveCooldown(seconds: number): string {
const template = COPY['resend.cooldown.message'];
const safe = Math.max(0, Math.floor(seconds));
return template.replace('{seconds}', String(safe));
}

export function verifyAcknowledgementSnapshot(): string {
return COPY['verify.acknowledgement.body'];
}

export function resendAcknowledgementSnapshot(): string {
return COPY['resend.acknowledgement.body'];
}