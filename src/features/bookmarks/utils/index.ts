/**
 * Bookmarks feature utility barrel.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C3.
 *
 * Re-exports the canonical mutation error-state mapper (C3) so the
 * slot (D4) and any future consumer can import from a stable
 * `@/features/bookmarks/utils` path without reaching into the
 * implementation directory.
 */

export {
  getBookmarkMutationErrorState,
} from './get-bookmark-mutation-error-state'

export type {
  BookmarkMutationErrorState,
  BookmarkMutationErrorStateKind,
  BookmarkMutationOutcomeKind,
} from './get-bookmark-mutation-error-state'