'use client';

/**
 * `CommentThread` — a single comment thread: top-level comment + reply
 * tree with visual connector lines for proper nesting hierarchy.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.17.
 *
 * ## Tree Structure
 *
 * The thread uses a visual tree pattern similar to social media platforms:
 *
 *   - A vertical connector line runs from the parent comment to its replies
 *   - Each reply is indented with a horizontal connector line
 *   - Replies can be collapsed/expanded individually
 *   - The tree structure makes parent-child relationships clear
 *
 * ## Visual Hierarchy
 *
 *   - Thread container: light background with subtle border
 *   - Top-level comment: full width, no indentation
 *   - Replies: indented with vertical/horizontal connector lines
 *   - Nested replies (if any): further indentation with lighter connector lines
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, MessageSquare } from 'lucide-react';

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

  const [expanded, setExpanded] = useState(true); // Threads expanded by default

  // Only mount the replies-mode hook when the user expands the thread
  const repliesQuery = useQuizComments(
    expanded && hasExtraReplies
      ? { quizId, filters: { parentId: thread.id, limit: REPLY_DEFAULT_LIMIT } }
      : { quizId: null },
  );

  const extraReplies: readonly CommentItemType[] = useMemo(() => {
    if (!expanded) return [];
    return repliesQuery.items.map((item): CommentItemType => {
      const { replies: _replies, ...rest } = item as CommentThreadItem;
      void _replies;
      return rest as unknown as CommentItemType;
    });
  }, [expanded, repliesQuery.items]);

  const totalReplies = thread.repliesCount;

  return (
    <section
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card overflow-hidden',
        className,
      )}
      data-testid={`comment-thread-${thread.id}`}
      data-thread-id={thread.id}
    >
      {/* ─── Thread header with toggle ──────────────────────────────── */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30'>
        <div className='flex items-center gap-2 text-sm font-medium text-foreground'>
          <MessageSquare size={16} aria-hidden className='text-muted-foreground' />
          <span>{totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}</span>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => setExpanded(!expanded)}
          className='text-xs text-muted-foreground hover:text-foreground'
          data-testid={`comment-thread-toggle-${thread.id}`}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} aria-hidden className='mr-1' />
              Hide replies
            </>
          ) : (
            <>
              <ChevronDown size={14} aria-hidden className='mr-1' />
              Show replies
            </>
          )}
        </Button>
      </div>

      {/* ─── Collapsed state ─────────────────────────────────────────── */}
      {!expanded && (
        <div className='px-4 py-3 text-xs text-muted-foreground'>
          Replies hidden
        </div>
      )}

      {/* ─── Expanded content ────────────────────────────────────────── */}
      {expanded && (
        <div className='flex flex-col'>
          {/* ─── Top-level comment ─────────────────────────────────────── */}
          <div className='p-4'>
            <CommentItem
              comment={thread}
              depth={0}
              quizId={quizId}
              currentUserId={currentUserId ?? null}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* ─── Reply tree ──────────────────────────────────────────── */}
          {firstPageReplies.length > 0 && (
            <div
              className='relative'
              data-testid={`comment-thread-replies-${thread.id}`}
            >
              {/* Vertical connector line */}
              <div className='absolute left-8 top-0 bottom-0 w-px bg-border' />

              <div className='flex flex-col divide-y divide-border/50'>
                {firstPageReplies.map((reply) => (
                  <div key={reply.id} className='relative'>
                    {/* Horizontal connector */}
                    <div className='absolute left-8 top-8 w-4 h-px bg-border' />

                    <div className='pl-8 sm:pl-12 pr-4 py-3'>
                      <CommentItem
                        comment={reply}
                        depth={1}
                        quizId={quizId}
                        currentUserId={currentUserId ?? null}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Extra replies section ─────────────────────────────────── */}
          {hasExtraReplies && (
            <div className='border-t border-border'>
              {expanded && hasExtraReplies && (
                <div className='divide-y divide-border/50'>
                  {repliesQuery.isLoading && repliesQuery.items.length === 0 ? (
                    <div className='px-4 py-2'>
                      <CommentItemSkeleton depth={1} />
                      <CommentItemSkeleton depth={1} />
                    </div>
                  ) : (
                    extraReplies.map((reply) => (
                      <div key={reply.id} className='relative'>
                        {/* Horizontal connector */}
                        <div className='absolute left-8 top-8 w-4 h-px bg-border' />
                        <div className='pl-8 sm:pl-12 pr-4 py-3'>
                          <CommentItem
                            comment={reply}
                            depth={1}
                            quizId={quizId}
                            currentUserId={currentUserId ?? null}
                            isAuthenticated={isAuthenticated}
                          />
                        </div>
                      </div>
                    ))
                  )}

                  {/* Load more button */}
                  {repliesQuery.hasMore && (
                    <div className='px-4 py-3'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => repliesQuery.loadMore()}
                        disabled={repliesQuery.isLoadingMore}
                        data-testid={`comment-thread-load-more-${thread.id}`}
                        className='text-xs text-muted-foreground hover:text-foreground'
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
            </div>
          )}
        </div>
      )}
    </section>
  );
}