'use client';

/**
 * `CommentThread` — a single comment thread: top-level comment + reply
 * list + reply form.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.17.
 *
 * ## Composition
 *
 *   - `<CommentItem depth={0}>` for the top-level comment.
 *   - One `<CommentItem depth={1}>` per first-page reply (the server
 *     embeds the first page of replies on the `CommentThreadItem`).
 *   - When `repliesCount > firstPage.length`, a "Show N more replies"
 *     button loads additional pages via `useQuizComments` with the
 *     reply-mode filter (`parentId`).
 *   - `<CommentReplyForm>` for posting new replies (collapsed by
 *     default; lives inside the top-level `<CommentItem>` already,
 *     so the thread does not need a second one — see note below).
 *
 * ## Reply form placement
 *
 * Per Epic 4.12 spec, the reply composer lives INSIDE the top-level
 * `<CommentItem />` (the same row as the comment body). This thread
 * wrapper does NOT mount a second `<CommentReplyForm />` — that would
 * create two composers per thread. The ticket's "Reply form CTA visible
 * even when thread has no replies" is satisfied by the inline form in
 * `<CommentItem />` rendering unconditionally for the top-level row
 * when the viewer is authenticated.
 *
 * ## "Show more" pagination
 *
 * The thread mounts its own `useQuizComments` call with `filters.parentId
 * === comment.id`. Pages are appended below the first-page replies as
 * the user clicks "Show N more".
 *
 * ## Visual treatment
 *
 * A 2-pixel left border (accent color) on the inner column visually
 * distinguishes a thread from the surrounding list. Replies are
 * indented by `CommentItem` itself when `depth === 1`.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import { CommentItem } from './CommentItem';
import { CommentItemSkeleton } from './CommentItem';
import { useQuizComments } from '@/features/comments/hooks/useQuizComments';
import {
  REPLY_DEFAULT_LIMIT,
  type CommentItem as CommentItemType,
  type CommentThreadItem,
} from '@/features/comments/types';

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentThreadProps {
  /** The thread's top-level comment, with the first page of replies inlined. */
  thread: CommentThreadItem;
  /** Quiz id — forwarded to the embedded reply form / replies fetch. */
  quizId: string;
  /** The authenticated viewer's id. `null` for guests. */
  currentUserId?: string | null;
  /** When true, vote / report / reply controls are interactive. */
  isAuthenticated: boolean;
  /** Optional className for the wrapping section. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CommentThread({
  thread,
  quizId,
  currentUserId,
  isAuthenticated,
  className,
}: CommentThreadProps) {
  const firstPageReplies: readonly CommentItemType[] = thread.replies ?? [];

  const remaining =
    Math.max(0, thread.repliesCount - firstPageReplies.length);
  const hasExtraReplies = remaining > 0;

  const [expanded, setExpanded] = useState(false);

  // Only mount the replies-mode hook when the user expands the thread
  // — this avoids a network call for every short thread on initial
  // load (the first page is already inlined on `thread.replies`).
  const repliesQuery = useQuizComments(
    expanded && hasExtraReplies
      ? { quizId, filters: { parentId: thread.id, limit: REPLY_DEFAULT_LIMIT } }
      : { quizId: null },
  );

  const extraReplies: readonly CommentItemType[] = useMemo(() => {
    if (!expanded) return [];
    // `useQuizComments` returns `CommentThreadItem[]`; reply-mode
    // payloads have `repliesCount` only (no embedded `replies`),
    // so we map them into the `CommentItem` shape consumers expect.
    return repliesQuery.items.map((item): CommentItemType => {
      const { replies: _replies, ...rest } = item as CommentThreadItem;
      void _replies;
      return rest as unknown as CommentItemType;
    });
  }, [expanded, repliesQuery.items]);

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border-l-2 border-l-primary/40 bg-card/30 pl-4 pr-1 sm:pl-5',
        className,
      )}
      data-testid={`comment-thread-${thread.id}`}
      data-thread-id={thread.id}
    >
      {/* ─── Top-level comment + its inline reply form ─────────────── */}
      <CommentItem
        comment={thread}
        depth={0}
        quizId={quizId}
        currentUserId={currentUserId ?? null}
        isAuthenticated={isAuthenticated}
      />

      {/* ─── Replies (first page, embedded) ────────────────────────── */}
      {firstPageReplies.length > 0 && (
        <div
          className='flex flex-col gap-3'
          data-testid={`comment-thread-replies-${thread.id}`}
        >
          {firstPageReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={1}
              quizId={quizId}
              currentUserId={currentUserId ?? null}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {/* ─── "Show N more replies" affordance ──────────────────────── */}
      {hasExtraReplies && (
        <div className='flex'>
          {expanded ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setExpanded(false)}
              disabled={repliesQuery.isLoadingMore}
              data-testid={`comment-thread-collapse-${thread.id}`}
              className='text-xs text-muted-foreground'
            >
              <ChevronUp size={14} aria-hidden />
              Show fewer replies
            </Button>
          ) : (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setExpanded(true)}
              data-testid={`comment-thread-expand-${thread.id}`}
              className='text-xs text-muted-foreground'
            >
              <ChevronDown size={14} aria-hidden />
              Show {remaining} more {remaining === 1 ? 'reply' : 'replies'}
            </Button>
          )}
        </div>
      )}

      {/* ─── Additional pages of replies (only mounted when expanded) */}
      {expanded && hasExtraReplies && (
        <div
          className='flex flex-col gap-3'
          data-testid={`comment-thread-extra-replies-${thread.id}`}
        >
          {repliesQuery.isLoading && repliesQuery.items.length === 0 ? (
            <>
              <CommentItemSkeleton depth={1} />
              <CommentItemSkeleton depth={1} />
            </>
          ) : (
            extraReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={1}
                quizId={quizId}
                currentUserId={currentUserId ?? null}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}

          {repliesQuery.hasMore && (
            <div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => repliesQuery.loadMore()}
                disabled={repliesQuery.isLoadingMore}
                data-testid={`comment-thread-load-more-${thread.id}`}
              >
                {repliesQuery.isLoadingMore && (
                  <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />
                )}
                Load more replies
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}