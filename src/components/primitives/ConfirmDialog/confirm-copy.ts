/**
 * ConfirmDialog — vocabulary source-of-truth.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.D1.
 *
 * Defines the 5 `ConfirmKind` variants and the typed `ConfirmCopy`
 * triple that every destructive / state-changing action routes through.
 * Lives separately from `<ConfirmDialog />` (TKT-4.1.D2) so that
 * feature code can import the vocabulary without pulling React.
 *
 * ## Why a vocabulary table (not inline strings)
 *
 * Three reasons, listed in master plan priority:
 *
 *   1. **Consistency** — every "delete this" dialog in Phase 4 says
 *      the same thing. The wording is reviewed once here, never
 *      duplicated per call site.
 *
 *   2. **Hard-delete semantic** — bookmarks are hard-deleted
 *      (master plan line 73). The `destructive-permanent` variant's
 *      body explicitly states permanence ("This cannot be undone.")
 *      so the user is never surprised by a soft delete masquerading
 *      as a permanent one (or vice versa).
 *
 *   3. **i18n seam** — when the project adds a translation layer
 *      (Phase 5+), the vocabulary is the only surface to swap.
 *      Call sites stay identical.
 *
 * ## Variant semantics
 *
 *   - `destructive-permanent`   — irreversible data loss (e.g.
 *                                 bookmark collection delete, account
 *                                 delete). Body states permanence.
 *   - `destructive-idempotent`  — reversible but unfamiliar (e.g. bulk
 *                                 bookmark remove). Body explains the
 *                                 breadth of the action.
 *   - `state-changing`          — non-destructive but flips the quiz
 *                                 from draft → published; cannot
 *                                 un-publish without a draft. Body
 *                                 explains the state change.
 *   - `irreversible-flow`       — multi-step process that locks the
 *                                 caller in (e.g. submit-and-complete
 *                                 an attempt). Body explains the
 *                                 downstream consequence.
 *   - `typed-confirm`           — high-stakes delete requiring the
 *                                 user to type a confirmation string
 *                                 (e.g. account delete, where typing
 *                                 the username is the standard
 *                                 affordance). The `typedString` is
 *                                 the (lowercased) `confirmLabel`.
 *
 * Consumers in stories 4.6 / 4.7 / 4.11 / 4.13 / 4.15 read this
 * vocabulary through `<ConfirmDialog kind="…" />`, never directly.
 * Consumers that want a vocabulary-only lookup (e.g. `getConfirmKind`
 * in TKT-4.1.D4) import `PHASE4_CONFIRM_KIND` and call it.
 *
 * @see ConfirmDialog — TKT-4.1.D2 — the React primitive.
 * @see phase4ConfirmCopyMap — TKT-4.1.D4 — Phase 4 entity → kind map.
 */

export type ConfirmKind =
  | 'destructive-permanent'
  | 'destructive-idempotent'
  | 'state-changing'
  | 'irreversible-flow'
  | 'typed-confirm';

export type ConfirmTone = 'danger' | 'warning' | 'info';

export type ConfirmCopy = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  /**
   * For `kind === 'typed-confirm'`: the literal string the user must
   * type into the dialog's input before the confirm button enables.
   * Lowercased in the comparison. Absent for non-typed variants.
   */
  typedString?: string;
};

/**
 * Default cancel / confirm vocabulary strings used by every variant.
 * Centralized so the cancellation copy is consistent across Phase 4.
 */
const DEFAULT_CANCEL = 'Cancel';

export const CONFIRM_COPY: Record<ConfirmKind, ConfirmCopy> = Object.freeze({
  /**
   * Permanent destruction — no undo path. Used by account deletion,
   * hard delete of bookmark collections, etc.
   */
  'destructive-permanent': {
    title: 'Delete permanently?',
    body: 'This cannot be undone. Once deleted, the data is permanently removed from the system and cannot be recovered.',
    confirmLabel: 'Delete permanently',
    cancelLabel: DEFAULT_CANCEL,
    tone: 'danger',
  },

  /**
   * Reversible-but-broad — bulk operations the user can recover
   * from with effort. Used by bulk bookmark remove, bulk quiz
   * question removal, etc.
   */
  'destructive-idempotent': {
    title: 'Remove these items?',
    body: 'These items will be removed from your collection. You can re-add them later by searching for them again.',
    confirmLabel: 'Remove',
    cancelLabel: DEFAULT_CANCEL,
    tone: 'warning',
  },

  /**
   * State flip — non-destructive but the action moves the entity
   * into a state that needs explicit work to revert. Used by quiz
   * publish, attempt complete, etc.
   */
  'state-changing': {
    title: 'Continue?',
    body: 'This will change the state of the item. You can take further actions after this completes.',
    confirmLabel: 'Continue',
    cancelLabel: DEFAULT_CANCEL,
    tone: 'info',
  },

  /**
   * Multi-step flow — entering this dialog commits the user to a
   * downstream path they cannot easily leave (e.g. submit-and-complete).
   */
  'irreversible-flow': {
    title: 'Are you sure?',
    body: 'Once you start, you will not be able to change the answers you submit. Make sure you are ready before continuing.',
    confirmLabel: "I'm ready",
    cancelLabel: 'Go back',
    tone: 'warning',
  },

  /**
   * Typed-confirm deletion — high-stakes, requires explicit text
   * confirmation. The user must type the lowercased `confirmLabel`
   * before the confirm button enables.
   */
  'typed-confirm': {
    title: 'Type to confirm',
    body: 'This is a permanent action. Type the word below to confirm.',
    confirmLabel: 'Confirm',
    cancelLabel: DEFAULT_CANCEL,
    tone: 'danger',
    typedString: 'confirm',
  },
});

/**
 * Canonical list of `ConfirmKind` values, used by tests and by
 * downstream code that needs to enumerate every supported variant
 * (e.g. for type-level exhaustiveness checks).
 */
export const CONFIRM_KINDS: readonly ConfirmKind[] = Object.freeze([
  'destructive-permanent',
  'destructive-idempotent',
  'state-changing',
  'irreversible-flow',
  'typed-confirm',
]);

/**
 * Look up the copy triple for a variant. Returns the same frozen
 * object as `CONFIRM_COPY[kind]`; isolated for call-site readability
 * and future refactors (e.g. if a backend locale override is added).
 */
export function getConfirmCopy(kind: ConfirmKind): ConfirmCopy {
  return CONFIRM_COPY[kind];
}
