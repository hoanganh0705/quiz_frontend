/**
 * BookmarkButton primitive barrel.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D1.
 *
 * Re-exports the controlled `<BookmarkButton />` primitive and its
 * inline `<BookmarkButtonErrorNotice />` so the per-feature slot
 * (D4) and the page composition can import them from the public
 * `@/components/primitives` barrel without reaching into the
 * implementation directory.
 */

export { BookmarkButton } from './BookmarkButton';
export type { BookmarkButtonProps, BookmarkButtonVariant } from './BookmarkButton';

export { BookmarkButtonErrorNotice } from './BookmarkButtonErrorNotice';
export type { BookmarkButtonErrorNoticeProps } from './BookmarkButtonErrorNotice';

export { BookmarkButtonSlot } from './BookmarkButtonSlot';
export type {
  BookmarkButtonSlotProps,
  BookmarkButtonSlotVariant,
} from './BookmarkButtonSlot';