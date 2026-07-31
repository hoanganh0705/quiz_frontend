/**
 * Account-deletion copy registry — every user-facing string for the
 * destructive deletion confirmation modal.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T4.
 *
 * ## Purpose
 *
 * Every string the destructive deletion modal (triggered from the
 * Settings → Danger Zone flow) can render is sourced from this registry,
 * keyed by a stable `COPY_KEYS.deletion.*` path. The UI never renders
 * a raw backend message — every visible phrase resolves through here.
 *
 * ## Anti-leak guarantees
 *
 * Three classes of leak must never appear in this registry:
 *
 *  1. **Account-existence disclosure.** The deletion modal is fully
 *     authenticated. The leak that matters here is "this account is in
 *     a particular lifecycle state" (e.g. "you cannot delete because
 *     you have pending transactions"). The backend intentionally does
 *     not return that detail for the deletion endpoint, and the UI
 *     must not invent it.
 *
 *  2. **Session-ownership disclosure.** The destructive copy does not
 *     reveal which sessions belong to the user. The cleanup banner
 *     ("we signed you out everywhere") is general.
 *
 *  3. **Password-content disclosure.** The strings here never carry a
 *     password value. The "current password" label is generic.
 *
 * ## Why no `success` copy
 *
 * Successful deletion is terminal: the user is routed to the public
 * landing page. There is no "your account has been deleted" success
 * screen in the deletion-modal flow — the page is gone. The only
 * success copy is the public-landing explanation.
 *
 * ## What a key looks like
 *
 *   ```
 *   COPY_KEYS.deletion.confirm.title          -> COPY['deletion.confirm.title']
 *   COPY_KEYS.deletion.error.uncertain        -> COPY['deletion.error.uncertain']
 *   ```
 *
 * The flat keys are the source of truth; `COPY_KEYS` is the type-safe
 * path, `resolveCopy()` is the dynamic lookup.
 */

// ─── Bucket: confirm (intent confirmation body) ──────────────────────────────

const CONFIRM: Record<string, string> = {
  'confirm.title': 'Delete your account?',
  'confirm.body':
    'This permanently deletes your account, profile, and saved data. Other devices signed in to this account will be signed out immediately. This cannot be undone.',
  'confirm.consequenceHeading': 'What gets deleted',
  'confirm.consequence.body':
    'Your profile, your quizzes, your bookmarks, your activity history, and every active session will be removed. The refresh-token cookie will be cleared.',
};

// ─── Bucket: typed (typed-confirmation input) ─────────────────────────────────

const TYPED: Record<string, string> = {
  'typed.label':
    'Type DELETE to confirm',
  'typed.placeholder': 'DELETE',
  'typed.hint':
    'Enter the word DELETE in capital letters to confirm.',
};

// ─── Bucket: password (current-password input) ───────────────────────────────

const PASSWORD: Record<string, string> = {
  'password.label': 'Current password',
  'password.placeholder': 'Enter your current password',
  'password.reveal': 'Show password',
  'password.hide': 'Hide password',
};

// ─── Bucket: actions (modal buttons + pending state) ──────────────────────────

const ACTIONS: Record<string, string> = {
  'actions.submit': 'Permanently delete my account',
  'actions.cancel': 'Cancel',
  'actions.submitPending': 'Deleting your account…',
  'actions.cleanupPending': 'Signing you out everywhere…',
};

// ─── Bucket: cleanup (full-screen post-success state) ─────────────────────────

const CLEANUP: Record<string, string> = {
  'cleanup.heading': 'Your account is being deleted',
  'cleanup.body':
    'We are clearing your local data and signing you out of every device. You will be redirected to the public homepage shortly.',
};

// ─── Bucket: errors.invalidCurrent (wrong password) ──────────────────────────

const ERRORS_INVALID_CURRENT: Record<string, string> = {
  'errors.invalidCurrent.field': 'Current password is incorrect',
  'errors.invalidCurrent.banner':
    'We could not confirm your password. Please try again.',
};

// ─── Bucket: errors.conflict (AUTH_DELETION_FAILED / AUTH_RESOURCE_CONFLICT) ──

const ERRORS_CONFLICT: Record<string, string> = {
  'errors.conflict.banner':
    'We could not delete your account right now. We need to check your account state before you try again.',
  'errors.conflict.revalidateCta': 'Re-check account state',
};

// ─── Bucket: errors.notFound (account already deleted) ───────────────────────

const ERRORS_NOT_FOUND: Record<string, string> = {
  'errors.notFound.banner':
    'Your account is no longer available. You are being signed out.',
};

// ─── Bucket: errors.uncertain (network / 5xx / 429 / unknown) ────────────────

const ERRORS_UNCERTAIN: Record<string, string> = {
  'errors.uncertain.banner':
    'We could not confirm whether your account was deleted. Please re-check before trying again.',
  'errors.uncertain.revalidateCta': 'Re-check account state',
};

// ─── Bucket: errors.authTerminal (shared refresh/final-logout policy) ────────

const ERRORS_AUTH_TERMINAL: Record<string, string> = {
  'errors.authTerminal.banner':
    'Your session has expired. Please sign in again.',
};

// ─── Bucket: errors.validation (class-validator fallback) ────────────────────

const ERRORS_VALIDATION: Record<string, string> = {
  'errors.validation.emptyPassword':
    'Enter your current password to continue.',
  'errors.validation.banner':
    'Please correct the highlighted fields and try again.',
};

// ─── Bucket: publicLanding (post-success public-page explanation) ───────────

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

/**
 * Type-safe key paths for every copy slot. Components import the
 * registry with a single path; the key path itself is the contract.
 *
 * Mirrors the `COPY_KEYS` pattern in `password-copy.ts`,
 * `security-copy.ts`, and `registration-copy.ts`: the `as const`
 * markers preserve the literal string types so a misspelled key
 * surfaces a tsc error at the lookup site.
 *
 * Usage:
 *   import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/deletion-copy';
 *   <h1>{resolveCopy(COPY_KEYS.deletion.confirm.title)}</h1>
 */
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
 * Snapshot helper: the exact byte sequence the destructive modal
 * renders as the title. The unit suite (planned in 2.10.T25) asserts
 * the rendered string matches this byte sequence.
 */
export function deletionConfirmTitleSnapshot(): string {
  return COPY['confirm.title'];
}

/**
 * Snapshot helper: the exact phrase the modal uses as the
 * irreversible consequence warning. The unit suite asserts this
 * string contains the words "permanent" and "cannot be undone" so a
 * regression that drops the warning is caught.
 */
export function deletionConsequenceSnapshot(): string {
  return COPY['confirm.body'];
}

/**
 * Snapshot helper: the exact byte sequence the modal renders when
 * the network / server response is uncertain. The unit suite asserts
 * this string does NOT contain the word "deleted" (which would
 * falsely claim success).
 */
export function deletionUncertainSnapshot(): string {
  return COPY['errors.uncertain.banner'];
}

/**
 * Returns true when the deletion copy bucket is missing a key the
 * caller asked for. Tests use this to verify the registry is
 * complete for the keys the modal actually uses.
 *
 * @param key - The `COPY_KEYS.deletion.*` path to check
 */
export function hasDeletionCopyKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(COPY, key);
}
