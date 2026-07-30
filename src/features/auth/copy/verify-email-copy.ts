/**
 * Verify-email and resend-verification copy registry — every
 * user-facing string for the verify / resend flow.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.B1.
 *
 * ## Anti-enumeration contract
 *
 * The grep rule below must return zero matches inside the rendered
 * string values:
 *
 *   grep -E "already|duplicate|exists|verified|invalid|expired|success" verify-email-copy.ts
 *
 * Reviewers: any PR that adds a string here is a PR that adds a string
 * the user sees on the verify / resend flow. The mapper in
 * `verify-email-error-mapper.ts` (TKT-2.2.B2) does the runtime
 * filtering; this file is the **static** contract for copy.
 *
 * The acceptance criterion TKT-2.2.B1-2 — "the `verify.acknowledgement.body`
 * and `verify.invalid.body` strings are byte-identical" — is enforced
 * here by giving both IDs the same literal value. The vitest suite in
 * TKT-2.2.E3 asserts the equality at runtime.
 *
 * ## Two layers
 *
 * Same convention as `registration-copy.ts` (TKT-2.1.B3): a flat
 * `ID → string` catalog under `COPY` and a tree-shape `verifyEmailCopy`
 * back-compat export. Components always go through `resolveCopy()` so
 * the lookup key is typo-detectable.
 *
 * ## What a key looks like
 *
 *   `verify.loading.title`            — page heading while a token is being verified
 *   `verify.loading.body`             — body copy during in-flight verification
 *   `verify.acknowledgement.title`    — page heading after a verified/error response
 *   `verify.acknowledgement.body`     — neutral body the user sees after EVERY response
 *   `verify.invalid.title`            — page heading for a malformed token (no backend call)
 *   `verify.invalid.body`             — SAME literal as `verify.acknowledgement.body`
 *   `verify.invalid.tryAgain`         — retry button label
 *   `verify.invalid.resendLabel`      — link to resend verification
 *   `verify.invalid.loginLabel`       — link to login
 *
 *   `resend.loading`                  — submit button label while in flight
 *   `resend.idle.placeholder`         — email field placeholder
 *   `resend.idle.help`                — help copy under the field
 *   `resend.acknowledgement.title`    — heading after success
 *   `resend.acknowledgement.body`     — body copy the user sees for EVERY successful response
 *   `resend.error.rate_limited`       — copy on 429
 *   `resend.error.server`             — copy on 5xx
 *   `resend.cooldown.message`         — countdown copy during cooldown
 *
 * No template variables: the anti-enumeration rule forbids
 * interpolating the user-supplied token or email into any of these
 * strings.
 */

/**
 * Flat ID → string catalog. The form layer never reaches into the
 * tree shape of `verifyEmailCopy` directly; it always goes through
 * `resolveCopy(<COPY_KEYS.*>)` so the lookup key is a literal ID
 * (typo-detectable) and the resolver can return `''` for unknown
 * IDs without crashing.
 */
const COPY: Readonly<Record<string, string>> = Object.freeze({
  // ─── Verify-email page ─────────────────────────────────────────────────
  //
  // Two separate IDs that resolve to the same literal: any
  // successful verify response AND any client-side malformed-token
  // fallback path render the same body. The vitest suite asserts
  // equality. Do NOT split the literal across the two IDs without
  // updating the test in TKT-2.2.E3.
  'verify.loading.title': 'Verifying your email',
  'verify.loading.body':
    'Hang tight while we confirm your email address. You can close this tab — the link works once.',
  'verify.acknowledgement.title': 'Check your inbox',
  'verify.acknowledgement.body':
    'If the link you opened is recognised, you can now sign in. If not, request a new link below — the result above does not reveal which case applies.',
  'verify.acknowledgement.action':
    'Open your email and click the verification link to continue.',
  'verify.invalid.title': 'Check your inbox',
  // byte-identical to `verify.acknowledgement.body` by spec.
  'verify.invalid.body':
    'If the link you opened is recognised, you can now sign in. If not, request a new link below — the result above does not reveal which case applies.',
  'verify.invalid.tryAgain': 'Try the link again',
  'verify.invalid.resendLabel': 'Request a new verification link',
  'verify.invalid.loginLabel': 'Sign in',

  // ─── Resend-verification page ──────────────────────────────────────────
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

/**
 * Backwards-compatible `verifyEmailCopy` tree. The tree shape is
 * preserved so any older caller that imported it for a deep read
 * continues to work; new code MUST go through `resolveCopy` and the
 * flat catalog above.
 */
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

/**
 * Compile-time-checked key constants. The `as const` markers preserve
 * the literal string types so `switch (kind)` over `errorKind`
 * surfaces tsc errors when a new branch is added without updating
 * the form.
 */
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
  const template = COPY['resend.cooldown.message'];
  const safe = Math.max(0, Math.floor(seconds));
  return template.replace('{seconds}', String(safe));
}

/**
 * Snapshot helpers for the F2 anti-enumeration Playwright specs.
 *
 * `verifyAcknowledgementSnapshot()` returns the exact byte sequence
 * the user sees at `/verify-email` for a successful response, an
 * error response, and a malformed-token fallback. The three must
 * produce the same `body` literal — that is the contract.
 *
 * `resendAcknowledgementSnapshot()` returns the body literal for the
 * resend page. The contract here is that this single literal covers
 * `unknown`, `verified`, and `unverified` emails (the F2 spec takes
 * three DOM snapshots against these cases and asserts equality).
 */
export function verifyAcknowledgementSnapshot(): string {
  return COPY['verify.acknowledgement.body'];
}

export function resendAcknowledgementSnapshot(): string {
  return COPY['resend.acknowledgement.body'];
}