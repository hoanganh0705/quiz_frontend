'use client';

/**
 * `CommentReplyForm` — inline reply composer for level-1 replies.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.14.
 *
 * ## Behavior
 *
 *   - Collapsed state shows a small "Reply" link.
 *   - Click → expanded state with a textarea (1–1000 chars), live
 *     counter, Reply (primary) and Cancel (outline) buttons.
 *   - Submit: calls `useCreateComment.createComment({ body, parentId })`.
 *     On success → clear / collapse / call `onReplied()`.
 *   - Reply button is disabled and shows the "Thread limit reached"
 *     disabled-copy when `useCommentThreadLookup.isAtReplyCap`
 *     returns `true` for `parentCommentId` (T-4.12.3). The server
 *     `COMMENT_REPLY_LIMIT_EXCEEDED` is shown as a banner inside the
 *     form, but the client gate prevents most attempts.
 *
 * ## Concurrency
 *
 * Only one `CommentReplyForm` should be open per thread at a time.
 * The convention is "lifted state in the parent thread":
 *
 *   ```tsx
 *   const [openReplyId, setOpenReplyId] = useState<string | null>(null);
 *   // ...
 *   <CommentReplyForm
 *     quizId={quizId}
 *     parentCommentId={comment.id}
 *     isOpen={openReplyId === comment.id}
 *     onOpenChange={(open) => setOpenReplyId(open ? comment.id : null)}
 *   />
 *   ```
 *
 * The component does NOT enforce singleton across siblings — the
 * parent owns that coordination.
 *
 * ## Length limits
 *
 * Max 1000 chars per Epic 4.12 spec line 1417.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';

import { useCreateComment } from '@/features/comments/hooks/useCreateComment';
import { useCommentThreadLookup } from '@/features/comments/stores/useCommentThreadLookup';

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentReplyFormProps {
  quizId: string;
  /** Parent comment id (the top-level comment being replied to). */
  parentCommentId: string;
  /** Controlled open state. Default: uncontrolled (starts collapsed). */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Notified after the reply is successfully posted. */
  onReplied?: () => void;
  /** Disabled (e.g. when the parent is soft-deleted). Default false. */
  disabled?: boolean;
  /**
   * Live reply count for the parent. Controls the collapsed CTA copy:
   *   - `0` → "Be the first to reply" (matches the empty-thread spec).
   *   - `> 0` → "Reply".
   * Internal; passed by `<CommentItem />` from the thread lookup store.
   */
  repliesCount?: number;
  /** Optional className for the outer wrapper. */
  className?: string;
}

const MAX_REPLY_LENGTH = 1000;
const REPLY_COOLDOWN_LABEL = 'Thread limit reached';

export function CommentReplyForm({
  quizId,
  parentCommentId,
  isOpen: controlledOpen,
  onOpenChange,
  onReplied,
  disabled = false,
  repliesCount = 0,
  className,
}: CommentReplyFormProps) {
  const titleId = useId();

  // Holds a reference to the collapsed trigger button so we can
  // return focus to it after the user cancels. The ref is captured
  // while the form is collapsed (button is mounted) and then read
  // by the cancel handler (form is mounted, button is unmounted).
  // `pendingRefocus` is a one-shot flag that the cancel handler sets
  // so the open-button's mount-effect re-runs focus() on the next
  // render — needed because the button is unmounted when the form
  // is open and remounted when it closes.
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingRefocusRef = useRef<boolean>(false);

  // Uncontrolled fallback when `onOpenChange` is not provided.
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  // After the form closes (cancel), the open button is remounted.
  // When it mounts, apply the pending focus so a keyboard user can
  // continue navigating from the same logical position.
  const handleOpenButtonMount = useCallback((node: HTMLButtonElement | null) => {
    openButtonRef.current = node;
    if (node && pendingRefocusRef.current) {
      pendingRefocusRef.current = false;
      node.focus();
    }
  }, []);

  const [body, setBody] = useState('');

  const lookup = useCommentThreadLookup(quizId);
  const atCap = lookup.isAtReplyCap(parentCommentId);
  // The `repliesCount` prop is the authoritative source for the CTA
  // copy: callers (`<CommentItem />` for top-level, etc.) pass the
  // embedded reply count from the thread payload. Fall back to the
  // lookup-store value when the prop is omitted (defensive — the
  // store is updated optimistically by writes).
  const replyCount = repliesCount ?? lookup.getRepliesCount(parentCommentId);

  const { createComment, isLoading, error, errorCopy, resetError } =
    useCreateComment(quizId);

  const handleBodyChange = (next: string) => {
    setBody(next);
    if (error) resetError();
  };

  if (disabled) return null;

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_REPLY_LENGTH;
  const empty = trimmed.length === 0;
  const submitDisabled = empty || tooLong || isLoading || atCap;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    const result = await createComment({ body: trimmed, parentId: parentCommentId });
    if (result) {
      setBody('');
      resetError();
      setOpen(false);
      onReplied?.();
    }
  };

  if (!isOpen) {
    const ctaLabel = replyCount === 0 ? 'Be the first to reply' : 'Reply';
    return (
      <button
        ref={handleOpenButtonMount}
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors',
          className,
        )}
        data-testid={`comment-reply-open-${parentCommentId}`}
        aria-label={ctaLabel}
      >
        <MessageSquare size={14} aria-hidden />
        {ctaLabel}
      </button>
    );
  }

  const showCapBanner = atCap;
  const showReplyLimitError =
    error && isApiError(error) && error.code === 'COMMENT_REPLY_LIMIT_EXCEEDED';
  const showOtherError = error && errorCopy && !showReplyLimitError;

  return (
    <div
      className={cn('flex flex-col gap-2 rounded-md border bg-card p-3', className)}
      data-testid={`comment-reply-form-${parentCommentId}`}
      aria-labelledby={titleId}
    >
      <label
        id={titleId}
        htmlFor={`comment-reply-body-${parentCommentId}`}
        className='text-sm font-medium'
      >
        Reply to this comment
      </label>
      <Textarea
        id={`comment-reply-body-${parentCommentId}`}
        data-testid={`comment-reply-body-${parentCommentId}`}
        value={body}
        onChange={(e) => handleBodyChange(e.currentTarget.value)}
        placeholder='Write a reply (1-1000 characters).'
        rows={3}
        maxLength={MAX_REPLY_LENGTH}
        disabled={atCap}
      />
      <div
        className={cn(
          'flex justify-end text-xs tabular-nums',
          tooLong ? 'text-destructive' : 'text-muted-foreground',
        )}
        aria-live='polite'
      >
        {trimmed.length} / {MAX_REPLY_LENGTH}
      </div>

      {showCapBanner && (
        <div
          role='status'
          data-testid={`comment-reply-cap-${parentCommentId}`}
          className='flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100'
        >
          <AlertTriangle className='mt-0.5 shrink-0' size={14} aria-hidden />
          <span>
            {REPLY_COOLDOWN_LABEL}. This thread has reached its
            {` ${lookup.getRepliesCount(parentCommentId)} `}
            reply limit.
          </span>
        </div>
      )}

      {showReplyLimitError && (
        <div
          role='alert'
          data-testid={`comment-reply-server-cap-${parentCommentId}`}
          className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive'
        >
          <AlertTriangle className='mt-0.5 shrink-0' size={14} aria-hidden />
          <span>{errorCopy?.body}</span>
        </div>
      )}

      {showOtherError && errorCopy && (
        <div
          role='alert'
          data-testid={`comment-reply-error-${parentCommentId}`}
          className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive'
        >
          <AlertTriangle className='mt-0.5 shrink-0' size={14} aria-hidden />
          <div>
            <p className='font-medium'>{errorCopy.title}</p>
            <p>{errorCopy.body}</p>
          </div>
        </div>
      )}

      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-muted-foreground' aria-live='polite'>
          {replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : null}
        </span>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setBody('');
              resetError();
              setOpen(false);
              // Schedule focus return on the next render where the
              // open button is mounted. The form's cancel handler
              // closes the form, React unmounts it, then re-mounts
              // the trigger button — `handleOpenButtonMount` picks
              // up the pending flag and applies focus on that mount.
              pendingRefocusRef.current = true;
            }}
            disabled={isLoading}
            data-testid={`comment-reply-cancel-${parentCommentId}`}
          >
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={submitDisabled}
            onClick={handleSubmit}
            aria-busy={isLoading || undefined}
            data-testid={`comment-reply-submit-${parentCommentId}`}
            title={atCap ? REPLY_COOLDOWN_LABEL : undefined}
          >
            {isLoading && <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />}
            {atCap ? REPLY_COOLDOWN_LABEL : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
