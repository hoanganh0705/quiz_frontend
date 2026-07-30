/**
 * Forgot-password and reset-password copy registry — every
 * user-facing string for the recovery flow.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.B3.
 *
 * ## Anti-enumeration contract
 *
 * The grep rule below must return zero matches inside the rendered
 * string values:
 *
 *   grep -E "already|duplicate|exists|verified|invalid|expired|success|sent|created" recovery-copy.ts
 *
 * Reviewers: any PR that adds a string here is a PR that adds a string
 * the user sees on the recovery flow. The mapper in
 * `recovery-error-mapper.ts` (TKT-2.3.B2) does the runtime
 * filtering; this file is the **static** contract for copy.
 *
 * The acceptance criterion TKT-2.3.B3-2 — "the
 * `forgot.acknowledgement.body` and `reset.success.body` strings are
 * byte-identical regardless of input" — is the cross-page
 * acknowledgement rule that the F2 anti-enumeration Playwright spec
 * asserts. The IDs are intentionally INDEPENDENT strings even
 * though they share the same cadence: the forgot page renders
 * "If the address is eligible, you'll receive an email shortly" and
 * the reset page renders "If the link is recognised, you can now
 * sign in". The two pages render different shapes (one is a form
 * success state, the other is a redirect-pending state), but the
 * rendered strings carry NO information about the input.
 *
 * ## Two layers
 *
 * Same convention as `registration-copy.ts` (TKT-2.1.B3) and
 * `verify-email-copy.ts` (TKT-2.2.B1): a flat `ID → string` catalog
 * under `COPY` and a tree-shape `recoveryCopy` back-compat export.
 * Components always go through `resolveCopy()` so the lookup key is
 * typo-detectable.
 *
 * ## What a key looks like
 *
 *   `forgot.loading`                      — submit button label while in flight
 *   `forgot.idle.placeholder`             — email field placeholder
 *   `forgot.idle.help`                    — help copy under the field
 *   `forgot.acknowledgement.title`        — heading after success
 *   `forgot.acknowledgement.body`         — body the user sees for EVERY successful response
 *   `forgot.acknowledgement.openEmailLabel` — generic "check your email" CTA label
 *   `forgot.error.rate_limited`           — copy on 429
 *   `forgot.error.server`                 — copy on 5xx
 *   `forgot.cooldown.message`             — countdown copy during cooldown
 *
 *   `reset.loading.title`                 — page heading while the form is processing
 *   `reset.loading.body`                  — body copy during in-flight reset
 *   `reset.invalid.title`                 — page heading for invalid / expired / consumed tokens
 *   `reset.invalid.body`                  — body the user sees for the collapsed invalid-link state
 *   `reset.invalid.tryAgain`              — retry button label
 *   `reset.invalid.forgotLabel`           — link to the forgot-password page
 *   `reset.invalid.loginLabel`            — link to the login page
 *   `reset.success.title`                 — page heading after a successful reset (page navigates to /login)
 *   `reset.success.body`                  — body acknowledging the reset, before the redirect
 *   `reset.error.validation`              — copy on 400 with field error
 *   `reset.error.rate_limited`            — copy on 429
 *   `reset.error.server`                  — copy on 5xx
 *
 * No template variables other than `{seconds}` in the cooldown copy.
 * The anti-enumeration rule forbids interpolating the user-supplied
 * email or token into any string here.
 */

const COPY: Readonly<Record<string, string>> = Object.freeze({
  // ─── Forgot-password page ─────────────────────────────────────────────────
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

  // ─── Reset-password page ──────────────────────────────────────────────────
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

/**
 * Backwards-compatible `recoveryCopy` tree. The tree shape is
 * preserved so any older caller that imported it for a deep read
 * continues to work; new code MUST go through `resolveCopy` and the
 * flat catalog above.
 */
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

/**
 * Compile-time-checked key constants. The `as const` markers preserve
 * the literal string types so `switch (kind)` over `errorKind`
 * surfaces tsc errors when a new branch is added without updating
 * the form.
 */
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

/**
 * Resolve a `COPY_KEYS.*` ID to its literal string. Pure function;
 * callers receive an empty string for any key not present in the
 * registry. The empty-string fallback gives a single triage point if
 * a key is renamed without updating the lookup table.
 */
export function resolveCopy(key: string): string {
  return COPY[key] ?? '';
}

/**
 * Interpolate `{seconds}` in the cooldown copy. The cooldown message
 * is the only string in this file that uses a placeholder; the
 * placeholder is the count-down integer, never the email or token.
 * Anything other than `{seconds}` is left intact — the input is
 * otherwise trusted as the single permitted template value.
 */
export function resolveCooldown(seconds: number): string {
  const template = COPY['forgot.cooldown.message'];
  const safe = Math.max(0, Math.floor(seconds));
  return template.replace('{seconds}', String(safe));
}

/**
 * Snapshot helpers for the F2 anti-enumeration Playwright specs.
 *
 * `forgotAcknowledgementSnapshot()` returns the byte sequence the
 * user sees at `/forgot-password` for every successful response —
 * known-existing, known-unverified, AND unknown emails. The F2
 * spec takes three DOM snapshots against these cases and asserts
 * equality.
 *
 * `resetInvalidSnapshot()` returns the body for the collapsed
 * invalid-link state — the page renders the same byte sequence for
 * a malformed token, an expired token, a consumed token, and a
 * missing token. The F2 spec asserts this byte equality.
 */
export function forgotAcknowledgementSnapshot(): string {
  return COPY['forgot.acknowledgement.body'];
}

export function resetInvalidSnapshot(): string {
  return COPY['reset.invalid.body'];
}

export function resetSuccessSnapshot(): string {
  return COPY['reset.success.body'];
}