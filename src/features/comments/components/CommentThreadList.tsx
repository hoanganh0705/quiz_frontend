'use client';

/**
 * `CommentThreadList` — scrollable list of all comment threads with
 * cursor pagination and skeleton loading.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.18.
 *
 * ## What this owns
 *
 *   - Top-level comment composer (`<TopLevelCommentForm />`) — visible
 *     only to authenticated viewers.
 *   - List of threads rendered via `<CommentThread />` (T-4.12.17).
 *   - "Load more" button when `hasMore: true` (delegates to
 *     `useQuizComments.loadMore()`).
 *   - Skeleton rows while the first page is loading.
 *   - Empty-state UI ("Be the first to comment.") when the list is
 *     fetched and empty.
 *
 * ## Auth gate
 *
 * The viewer identity is forwarded to every `<CommentThread />` so each
 * thread can decide which controls to render. The top-level composer
 * is hidden when `isAuthenticated === false`.
 */

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquare, Send } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { CommentItemSkeleton } from './CommentItem';
import { CommentThread } from './CommentThread';
import { useCreateComment } from '@/features/comments/hooks/useCreateComment';
import { useQuizComments } from '@/features/comments/hooks/useQuizComments';
import { type CommentThreadItem } from '@/features/comments/types';

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentThreadListProps {
  /** Quiz id to fetch comments for. */
  quizId: string;
  /** Authenticated viewer id (forwarded to every thread for ownership checks). */
  currentUserId?: string | null;
  /** When true, the viewer can compose, vote, report, reply. */
  isAuthenticated: boolean;
  /** Optional className for the wrapping section. */
  className?: string;
}

const MAX_BODY_LENGTH = 2000;
const TOP_LEVEL_SKELETON_COUNT = 5;

// ─── Component ────────────────────────────────────────────────────────────

export function CommentThreadList({
  quizId,
  currentUserId,
  isAuthenticated,
  className,
}: CommentThreadListProps) {
  const { items, isLoading, isLoadingMore, hasMore, loadMore, error, refresh } =
    useQuizComments({ quizId });

  return (
    <div className={cn('flex flex-col gap-6', className)} data-testid='comment-thread-list' data-quiz-id={quizId}>
      {/* ─── Top-level composer (auth-gated) ────────────────────────── */}
      {isAuthenticated && (
        <TopLevelCommentForm quizId={quizId} onPosted={refresh} />
      )}

      {/* ─── List ──────────────────────────────────────────────────── */}
      {isLoading && items.length === 0 ? (
        <SkeletonList />
      ) : error && items.length === 0 ? (
        <ListErrorBanner error={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className='flex flex-col gap-5'>
          {(items as readonly CommentThreadItem[]).map((thread) => (
            <CommentThread
              key={thread.id}
              thread={thread}
              quizId={quizId}
              currentUserId={currentUserId ?? null}
              isAuthenticated={isAuthenticated}
            />
          ))}

          {/* ─── "Load more" ────────────────────────────────────────── */}
          {hasMore && (
            <div className='flex justify-center pt-1'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => loadMore()}
                disabled={isLoadingMore}
                data-testid='comment-thread-list-load-more'
              >
                {isLoadingMore && (
                  <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />
                )}
                Load more comments
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function TopLevelCommentForm({
  quizId,
  onPosted,
}: {
  quizId: string;
  onPosted: () => Promise<void> | void;
}) {
  const [body, setBody] = useState('');
  const { createComment, isLoading, error, errorCopy, resetError } =
    useCreateComment(quizId);

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_BODY_LENGTH;
  const empty = trimmed.length === 0;
  const submitDisabled = empty || tooLong || isLoading;

  const handleSubmit = useCallback(async () => {
    if (submitDisabled) return;
    const result = await createComment({ body: trimmed });
    if (result) {
      setBody('');
      resetError();
      await onPosted();
    }
  }, [createComment, onPosted, resetError, submitDisabled, trimmed]);

  const errorMessage = useMemo(() => {
    if (error && isApiError(error)) {
      return getUserCopy(error.code);
    }
    return errorCopy;
  }, [error, errorCopy]);

  return (
    <form
      className='flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs'
      data-testid='comment-top-level-form'
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <label
        htmlFor='comment-top-level-body'
        className='text-sm font-medium'
      >
        Add a comment
      </label>
      <Textarea
        id='comment-top-level-body'
        data-testid='comment-top-level-body'
        value={body}
        onChange={(e) => {
          setBody(e.currentTarget.value);
          if (error) resetError();
        }}
        placeholder='Share your thoughts (1-2000 characters).'
        rows={3}
        maxLength={MAX_BODY_LENGTH}
      />
      <div className='flex items-center justify-between'>
        <span
          className={cn(
            'text-xs tabular-nums',
            tooLong ? 'text-destructive' : 'text-muted-foreground',
          )}
          aria-live='polite'
        >
          {trimmed.length} / {MAX_BODY_LENGTH}
        </span>
        <Button
          type='submit'
          size='sm'
          disabled={submitDisabled}
          aria-busy={isLoading || undefined}
          data-testid='comment-top-level-submit'
        >
          {isLoading && <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />}
          <Send className='mr-2' size={14} aria-hidden />
          Post Comment
        </Button>
      </div>
      {errorMessage && (
        <p
          role='alert'
          data-testid='comment-top-level-error'
          className='text-xs text-destructive'
        >
          {errorMessage.title}: {errorMessage.body}
        </p>
      )}
    </form>
  );
}

function SkeletonList() {
  return (
    <div className='flex flex-col gap-4' data-testid='comment-thread-list-skeleton'>
      {Array.from({ length: TOP_LEVEL_SKELETON_COUNT }, (_, idx) => (
        <CommentItemSkeleton key={idx} depth={0} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground'
      data-testid='comment-thread-list-empty'
    >
      <MessageSquare size={28} aria-hidden className='text-muted-foreground/70' />
      <p className='font-medium text-foreground'>Be the first to comment.</p>
      <p className='max-w-sm text-xs'>
        Start the conversation — your reply will appear here.
      </p>
    </div>
  );
}

function ListErrorBanner({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => Promise<void> | void;
}) {
  const copy = error && isApiError(error) ? getUserCopy(error.code) : null;
  return (
    <div
      role='alert'
      data-testid='comment-thread-list-error'
      className='flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'
    >
      <AlertTriangle className='mt-0.5 shrink-0' size={18} aria-hidden />
      <div className='flex-1'>
        <p className='font-medium'>{copy?.title ?? 'Comments unavailable'}</p>
        <p className='text-xs'>{copy?.body ?? 'Please try again in a moment.'}</p>
      </div>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => void onRetry()}
        data-testid='comment-thread-list-retry'
      >
        Retry
      </Button>
    </div>
  );
}