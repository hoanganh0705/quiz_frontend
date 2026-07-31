/**
 * Password-management copy registry — every user-facing string for
 * the verify-password modal and the change-password card.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T3.
 *
 * ## Purpose
 *
 * Every string the verify-password modal (`/settings/security` launcher)
 * and the change-password card can render is sourced from this
 * registry, keyed by a stable `COPY_KEYS.password.*` path. The UI
 * never renders a raw backend message — every visible phrase resolves
 * through here.
 *
 * ## Anti-leak guarantees
 *
 * Two classes of leak must never appear in this registry:
 *
 *  1. **Account-existence disclosure.** The verify-password modal and
 *     change-password card are fully authenticated, so the threat
 *     model is different from the public forms. The leak that matters
 *     here is password-history detail (e.g. "this matches your
 *     password from 2024-01-01") — the backend never returns that
 *     detail, and the UI must not invent it.
 *
 *  2. **Password-content disclosure.** The strings here never carry a
 *     password value. The strength-meter labels are generic ("Too
 *     weak" / "Weak" / "Fair" / "Good" / "Strong") and are matched to
 *     `password-strength.ts` so the two layers stay in lockstep.
 *
 * ## Two layers (canonical pattern)
 *
 * Same convention as `registration-copy.ts` (TKT-2.1.B3) and
 * `security-copy.ts` (2.8.T3): a flat `COPY: Record<string, string>`
 * catalog, and a tree-shape `COPY_KEYS` for stable key paths.
 * Components always go through `resolveCopy()` so a typo in the key
 * is detectable at the lookup site.
 *
 * ## What a key looks like
 *
 *   ```
 *   COPY_KEYS.password.verify.title       -> COPY['password.verify.title']
 *   COPY_KEYS.password.changePassword.success -> COPY['password.changePassword.success']
 *   ```
 *
 * The flat keys are the source of truth; `COPY_KEYS` is the type-safe
 * path, `resolveCopy()` is the dynamic lookup.
 */

// ─── Bucket: verify (verify-password modal) ──────────────────────────────────

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

// ─── Bucket: changePassword (change-password card) ───────────────────────────

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

// ─── Bucket: changePassword.errors (field-level error copy) ─────────────────
//
// These strings MUST be reachable from `mapPasswordError` classifications
// (`invalid_current`, `reuse`, `validation`). The mapper does not
// resolve them — the hook reads the classification and the component
// resolves the matching key. The contract is documented in 2.9.T2.

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

// ─── Bucket: changePassword.errors.banner (modal-level error copy) ───────────

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

// ─── Bucket: verify.errors (verify modal-level error copy) ───────────────────

const VERIFY_BANNER: Record<string, string> = {
  'verify.error.generic':
    'We could not confirm your password. Please try again.',
  'verify.error.invalidCurrent': 'Current password is incorrect',
  'verify.error.retryable':
    'We could not confirm your password. Please try again.',
  'verify.error.authTerminal':
    'Your session has expired. Please sign in again.',
};

// ─── Bucket: changePassword.strength (strength-meter copy) ──────────────────
//
// Mirrors the labels in `password-strength.ts` (TKT-2.1.B3 source).
// The strength meter reads from `password-strength.ts` at runtime
// (the score is calculated there); this bucket carries the human
// label that the UI displays alongside the score.

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

// ─── Bucket: changePassword.revalidation (post-change revalidation) ─────────

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

/**
 * Type-safe key paths for every copy slot. Components import the
 * registry with a single path; the key path itself is the contract.
 *
 * Mirrors the `COPY_KEYS` pattern in `registration-copy.ts` and
 * `security-copy.ts`: the `as const` markers preserve the literal
 * string types so a misspelled key surfaces a tsc error at the
 * lookup site.
 *
 * Usage:
 *   import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/password-copy';
 *   <h1>{resolveCopy(COPY_KEYS.password.verify.title)}</h1>
 */
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

/**
 * Identity resolver for the registry. Returns the string the key
 * points at; returns an empty string for any unknown key. The
 * empty-string fallback gives a single triage point if a key is
 * renamed without updating the lookup table.
 *
 * Pure function. Kept thin so a future move to i18n is a one-file
 * change.
 */
export function resolveCopy(key: string): string {
  return COPY[key] ?? '';
}

/**
 * Snapshot helper: the exact byte sequence the verify modal renders
 * when the password is wrong. The unit suite (planned for 2.9.T17)
 * asserts the rendered string matches this byte sequence.
 */
export function verifyInvalidCurrentSnapshot(): string {
  return COPY['verify.error.invalidCurrent'];
}

/**
 * Snapshot helper: the exact byte sequence the change-password card
 * renders when the new password is too weak.
 */
export function passwordTooWeakSnapshot(): string {
  return COPY['changePassword.errors.weak'];
}

/**
 * Snapshot helper: the exact byte sequence the change-password card
 * renders on a successful change.
 */
export function passwordChangeSuccessSnapshot(): string {
  return COPY['changePassword.success'];
}

/**
 * Returns true when the password copy bucket is missing a key the
 * caller asked for. Tests use this to verify the registry is
 * complete for the keys the modal / card actually use.
 *
 * @param key - The `COPY_KEYS.password.*` path to check
 */
export function hasPasswordCopyKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(COPY, key);
}
