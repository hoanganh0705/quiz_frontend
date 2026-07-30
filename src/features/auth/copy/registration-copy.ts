/**
 * Registration copy registry — every user-facing string for the
 * registration flow.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.B3.
 *
 * ## Anti-enumeration contract
 *
 * The grep rule below must return zero matches inside the string values:
 *
 *   grep -E "already|duplicate|exists|success|account created" registration-copy.ts
 *
 * Reviewers: any PR that adds a string here is a PR that adds a string
 * the user sees on the registration flow. The mapper in
 * `register-error-mapper.ts` (TKT-2.1.B2) does the runtime filtering;
 * this file is the **static** contract for copy. Both must agree.
 *
 * ## Two layers
 *
 * Layer 1 — string IDs that the form layer imports. These are stable
 * identifiers; the actual copy can be evolved in this file without
 * touching components. Use literal keys (dot-namespaced) so they sort
 * well in logs and IDE go-to-definition.
 *
 * Layer 2 — Optional i18n. Today the file ships English literals; when
 * i18n is wired in (separate epic), this registry is the catalogue the
 * i18n loader walks. No call site should hard-code a string the user
 * sees; if it does, replace it with a key here.
 *
 * ## What a key looks like
 *
 *   `'availability.checking'`     — the indicator row when a check is in flight
 *   `'availability.available'`    — the indicator row when available
 *   `'availability.unavailable'`  — the indicator row when unavailable (taken / reserved / blocked)
 *   `'availability.rate_limited'` — 'too many checks; try again in a minute'
 *   `'availability.server'`       — 'cannot check right now; submit and we'll confirm'
 *
 *   `'form.username.label'`       — the field label on the form
 *   `'form.username.placeholder'` — the field placeholder
 *
 *   `'submit.acknowledgement.body'` — the body copy on the post-submit acknowledgement page
 *
 *   `'submit.error.validation'`   — generic 'one or more fields need attention' copy
 *   `'submit.error.rate_limited'` — 'too many requests; please wait'
 *   `'submit.error.server'`       — 'something went wrong on our side; try again'
 *   `'submit.error.forbidden'`    — generic copy; never reveals the cause
 *
 * Every value is a plain string. No template variables: the
 * anti-enumeration rule forbids interpolating the user-supplied
 * email/username into any of these strings.
 */

/**
 * Flat ID → string catalog. The form layer never reaches into the
 * tree shape of `registrationCopy` directly; it always goes through
 * `resolveCopy(<COPY_KEYS.*>)` so the lookup key is a literal ID
 * (typo-detectable) and the resolver can return `''` for unknown
 * IDs without crashing.
 *
 * The keys declared in `COPY_KEYS` are the public surface; every key
 * in `COPY_KEYS` MUST appear in this map. The vitest suite asserts
 * that invariant and fails on drift.
 */
const COPY: Readonly<Record<string, string>> = Object.freeze({
  // ─── Availability indicator (per field) ─────────────────────────────────────
  'availability.checking': 'Checking…',
  'availability.available': 'Available',
  'availability.unavailable': 'Not available',
  'availability.rate_limited':
    'Too many checks. You can still submit — we will confirm everything by email.',
  'availability.server':
    'We cannot check right now. You can still submit — we will confirm by email.',
  'availability.silent': '',

  // ─── Form labels and placeholders ──────────────────────────────────────────
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

  // ─── Submit acknowledgement page ───────────────────────────────────────────
  //
  // The body is intentionally neutral. It does NOT say "your account was
  // created", "you may now log in", or anything that would distinguish a
  // successful registration from a "we already had that email" response.
  'submit.acknowledgement.title': 'Check your inbox',
  'submit.acknowledgement.body':
    'If the address you entered is eligible for a new account, you will receive an email with a verification link shortly. You can close this tab — the link works on this device.',
  'submit.acknowledgement.action':
    'Open your email and click the verification link to continue.',
  'submit.acknowledgement.resendLabel':
    'Did not get an email? Request another',
  'submit.acknowledgement.loginLabel': 'Verified? Sign in',

  // ─── Submit error copy (rendered via the mapper's `errorKind`) ─────────────
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

/**
 * Backwards-compatible `registrationCopy` tree. The tree shape is
 * preserved so any older caller that imported it for a deep read
 * continues to work; new code MUST go through `resolveCopy` and the
 * flat catalog above.
 */
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

/**
 * Compile-time-checked key constants. The `as const` markers preserve
 * the literal string types so `switch (kind)` over `errorKind`
 * surfaces tsc errors when a new branch is added without updating
 * the form.
 */
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
 * Snapshot helper for the F2 anti-enumeration Playwright spec. The
 * exact byte sequence the user sees at `/register/check-inbox` is
 * this one constant; the snapshot test compares the rendered DOM
 * between a brand-new email and a known-existing email and asserts
 * equality.
 */
export function acknowledgementBodySnapshot(): string {
  return COPY['submit.acknowledgement.body'];
}
