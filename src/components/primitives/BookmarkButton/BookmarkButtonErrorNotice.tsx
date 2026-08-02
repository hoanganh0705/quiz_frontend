'use client';

/**
 * `<BookmarkButtonErrorNotice />` — the inline copy surfaced above
 * the `<BookmarkButton />` whenever the most recent bookmark
 * mutation attempt produced a classified error.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D1.
 *
 * The notice is rendered in the same DOM region (the same flex
 * column wrapper owned by `<BookmarkButton />`) so it does NOT
 * introduce CLS. The notice uses `role='status'` and
 * `aria-live='polite'` so screen readers announce the change
 * without interrupting the user's current task.
 *
 * The mapping from `errorState.kind` to copy lives in the C3 mapper
 * (`getBookmarkMutationErrorState`). This notice is purely
 * presentational — it renders the title/body/retry flag.
 *
 * `setup-prompt`, `ok`, and `null` are intentionally rendered as
 * `null`; the slot (D4) reacts to those branches instead.
 *
 * @see getBookmarkMutationErrorState (C3)
 * @see BookmarkButton (D1)
 */

import type { BookmarkMutationErrorState } from '@/features/bookmarks/utils';

export interface BookmarkButtonErrorNoticeProps {
  /**
   * The discriminated error state from the C3 mapper.
   * `null` renders nothing.
   */
  errorState: BookmarkMutationErrorState;
  /**
   * Optional className applied to the notice wrapper.
   */
  className?: string;
}

export function BookmarkButtonErrorNotice({
  errorState,
  className,
}: BookmarkButtonErrorNoticeProps) {
  if (errorState.kind === 'ok' || errorState.kind === 'setup-prompt') {
    return null;
  }
  if (errorState.title === null || errorState.body === null) {
    return null;
  }

  return (
    <p
      role='status'
      aria-live='polite'
      data-testid={`bookmark-error-notice-${errorState.kind}`}
      className={
        className ??
        'text-xs text-destructive'
      }
    >
      <strong className='font-semibold'>{errorState.title}</strong>
      {' · '}
      <span>{errorState.body}</span>
    </p>
  );
}