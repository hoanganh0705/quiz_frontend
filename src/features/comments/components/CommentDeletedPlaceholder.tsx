/**
 * `CommentDeletedPlaceholder` — the muted placeholder rendered in place
 * of a soft-deleted comment.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.15.
 *
 * Stateless. The thread component observes the SWR cache update after
 * a `useDeleteComment` success (T-4.12.8) and renders this component
 * wherever a comment row would normally appear.
 *
 * Thread indentation is the caller's responsibility: the placeholder
 * is a single line that renders into whatever slot the comment
 * previously occupied.
 *
 * ## Aria
 *
 * Includes a screen-reader-only longer description for context.
 */

import { cn } from '@/shared/utils/merge-class-names';

export interface CommentDeletedPlaceholderProps {
  /** Override the placeholder text (rare — used for tests / admin views). */
  text?: string;
  /** Optional className for the wrapping element. */
  className?: string;
}

export function CommentDeletedPlaceholder({
  text = '[Comment deleted]',
  className,
}: CommentDeletedPlaceholderProps) {
  return (
    <div
      role='status'
      data-testid='comment-deleted-placeholder'
      className={cn(
        'flex h-9 items-center text-sm italic text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden>{text}</span>
      <span className='sr-only'>This comment has been deleted by its author.</span>
    </div>
  );
}