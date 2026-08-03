/**
 * Phase 4 destructive-action → `ConfirmKind` map.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.D4.
 *
 * Tells stories 4.6 / 4.7 / 4.11 / 4.13 / 4.15 (and any other Phase 4
 * destructive surface) which `<ConfirmDialog kind="…" />` variant to
 * render for each named action. Centralizes the choice so the
 * decision is reviewable in one PR rather than reinvented per call
 * site.
 *
 * Adding a new destructive action:
 *
 *   1. Add a `string-literal` entry to `PHASE4_ACTION_NAMES`
 *      (the const-typed runtime list) AND extend `Phase4Action`
 *      (the union of names).
 *   2. Add the action → kind pair to `PHASE4_CONFIRM_KIND` below.
 *   3. Add a test case in `phase4ConfirmCopyMap.spec.ts` covering
 *      the new entry.
 *
 * Consumers call `getConfirmKind(action)` (this file's export) when
 * rendering a confirm dialog — never read `PHASE4_CONFIRM_KIND`
 * directly. The helper hides the fallback.
 */

import type { ConfirmKind } from '@/components/primitives/ConfirmDialog/confirm-copy';

/**
 * Enumerated, string-literal names for every Phase 4 destructive
 * surface. Adding a new action is a three-step process (see header).
 */
export type Phase4Action =
  // Bookmarks (story 4.6 / 4.7)
  | 'bookmark.collection.delete'
  | 'collection.bulk-remove'
  | 'bookmark.recent.clear'
  // Attempts (story 4.11 / 4.15)
  | 'attempt.submit-and-complete'
  | 'attempt.withdraw'
  | 'attempt.abandon'
  // Quiz authoring (story 4.6 / 4.11)
  | 'quiz.publish'
  | 'quiz.version.delete'
  | 'quiz.question.bulk-remove'
  // Reviews (story 4.13)
  | 'review.delete'
  // Account (story 4.6 / personal area)
  | 'account.delete';

/**
 * Same as `Phase4Action`, but const-typed so it can drive a const
 * array lookup below.
 */
export const PHASE4_ACTION_NAMES: readonly Phase4Action[] = [
  'bookmark.collection.delete',
  'collection.bulk-remove',
  'bookmark.recent.clear',
  'attempt.submit-and-complete',
  'attempt.withdraw',
  'attempt.abandon',
  'quiz.publish',
  'quiz.version.delete',
  'quiz.question.bulk-remove',
  'review.delete',
  'account.delete',
] as const;

/**
 * Authoritative action → kind map. The Record's key type is the
 * literal union, so a typo in any key is a compile error. New
 * actions without a kind assignment fail the type check.
 */
export const PHASE4_CONFIRM_KIND: Record<Phase4Action, ConfirmKind> =
  Object.freeze({
    // Bookmarks (4.6 — bookmark collection CRUD; 4.7 — bulk remove).
    // Bookmark collections are hard-deleted (master plan line 73), so
    // permanent + bulk operations get the irreversible variants.
    'bookmark.collection.delete': 'destructive-permanent',
    'collection.bulk-remove': 'destructive-idempotent',
    'bookmark.recent.clear': 'destructive-idempotent',

    // Attempts (4.11 / 4.15): start/submit/complete lifecycle.
    'attempt.submit-and-complete': 'state-changing',
    // withdraw / abandon are reversible (the attempt can be re-entered
    // if the user has the dedicated resume link).
    'attempt.withdraw': 'state-changing',
    'attempt.abandon': 'state-changing',

    // Quiz authoring (4.6 / 4.11).
    'quiz.publish': 'state-changing',
    // Quiz versions: deleting a draft is reversible (re-create); deleting
    // a published version is permanent. Until phase 5 the destroy endpoint
    // maps to permanent.
    'quiz.version.delete': 'destructive-permanent',
    'quiz.question.bulk-remove': 'destructive-idempotent',

    // Reviews (4.13).
    'review.delete': 'destructive-permanent',

    // Account (4.6 — account deletion is a two-step typed-confirm flow).
    'account.delete': 'typed-confirm',
  });

/**
 * Look up the kind for a Phase 4 action. Unknown / unrecognised
 * action names fall back to `'destructive-permanent'` (the strictest
 * variant) so the dialog is at least safe-by-default.
 *
 * Call sites typically wire this directly to `<ConfirmDialog kind={…}/>`:
 *
 *   const kind = getConfirmKind(actionName);
 *   <ConfirmDialog kind={kind} open={…} ... />
 */
export function getConfirmKind(action: string): ConfirmKind {
  if ((PHASE4_ACTION_NAMES as readonly string[]).includes(action)) {
    return PHASE4_CONFIRM_KIND[action as Phase4Action];
  }
  return 'destructive-permanent';
}

/**
 * Reverse lookup: given a `ConfirmKind`, return every Phase 4 action
 * that maps to it. Useful for documentation pages and for tests that
 * want to enumerate the destructive surface.
 */
export function actionsForKind(kind: ConfirmKind): readonly Phase4Action[] {
  return PHASE4_ACTION_NAMES.filter((a) => PHASE4_CONFIRM_KIND[a] === kind);
}
