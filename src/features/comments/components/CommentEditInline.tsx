'use client';

/**
 * `CommentEditInline` — edit / delete affordances for the author's own
 * comments.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.13.
 *
 * ## What this owns
 *
 *   - Renders the pencil (edit) and trash (delete) icons next to a
 *     comment body, when the viewer is the comment owner. When the
 *     viewer is not the owner, the component returns `null` — the
 *     affordances are not exposed.
 *   - Edit mode replaces the body with an inline `<Textarea>`
 *     (Save / Cancel buttons).
 *   - Delete mode opens a `<ConfirmDialog>` (Epic 4.1) with the
 *     `destructive-permanent` variant. On confirm, calls
 *     `useDeleteComment.deleteComment()` and notifies the parent
 *     via `onDeleted()` so the comment thread can render the
 *     `<CommentDeletedPlaceholder />`.
 *
 * ## Length limits
 *
 *   - Top-level comment body: max 2000 chars (Epic 4.12 spec line 1417).
 *   - Reply body: max 1000 chars (per `CommentReplyForm`).
 *
 * The parent passes the appropriate `maxLength` via prop; default
 * 2000.
 *
 * ## Draft sync
 *
 * The draft body is reset to `initialBody` whenever the user cancels
 * editing OR when the parent supplies a new `initialBody` while the
 * user is not actively editing (e.g. a parallel update from another
 * tab). The reset on prop-change is implemented with a ref + render-
 * time check to avoid the setState-in-effect lint pattern.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog/ConfirmDialog';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { useEditComment } from '@/features/comments/hooks/useEditComment';
import { useDeleteComment } from '@/features/comments/hooks/useDeleteComment';

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentEditInlineProps {
  commentId: string;
  initialBody: string;
  /** Required — the delete hook needs to know the parent for the reply-count decrement. */
  parentCommentId?: string | null;
  /** Required — the controls only render when the viewer is the author. */
  isOwner: boolean;
  /** Max body length. Default 2000 (top-level); pass 1000 for replies. */
  maxLength?: number;
  /** Notified after a successful delete (so the parent can render the placeholder). */
  onDeleted?: () => void;
  /** Optional className for the icon row. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CommentEditInline({
  commentId,
  initialBody,
  parentCommentId = null,
  isOwner,
  maxLength = 2000,
  onDeleted,
  className,
}: CommentEditInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(initialBody);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const seenInitialRef = useRef(initialBody);

  const {
    editComment,
    isLoading: isEditing,
    error: editError,
  } = useEditComment(commentId);

  const {
    deleteComment,
    isLoading: isDeleting,
    error: deleteError,
  } = useDeleteComment(commentId, {
    parentId: parentCommentId,
  });

  // Re-seed the draft when the upstream body changes (e.g. a parallel
  // edit landed). Only when the user is not actively editing.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (seenInitialRef.current !== initialBody) {
      seenInitialRef.current = initialBody;
      if (!editing) {
        setDraftBody(initialBody);
      }
    }
  }, [initialBody, editing]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOwner) return null;

  const trimmed = draftBody.trim();
  const editValid =
    trimmed.length >= 1 && trimmed.length <= maxLength && trimmed !== initialBody;

  const handleSave = async () => {
    const ok = await editComment({ body: trimmed });
    if (ok) {
      setEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    const ok = await deleteComment();
    if (ok) {
      setConfirmOpen(false);
      onDeleted?.();
    }
  };

  const editErrorCopy = editError && isApiError(editError)
    ? getUserCopy(editError.code)
    : null;
  const deleteErrorCopy = deleteError && isApiError(deleteError)
    ? getUserCopy(deleteError.code)
    : null;

  if (editing) {
    return (
      <div className={cn('flex flex-col gap-2', className)} data-testid={`comment-edit-${commentId}`}>
        <Textarea
          data-testid={`comment-edit-body-${commentId}`}
          value={draftBody}
          onChange={(e) => setDraftBody(e.currentTarget.value)}
          rows={4}
          maxLength={maxLength}
        />
        <div className='flex items-center justify-between text-xs text-muted-foreground tabular-nums'>
          <span>{trimmed.length} / {maxLength}</span>
          {editErrorCopy && (
            <span
              role='alert'
              data-testid={`comment-edit-error-${commentId}`}
              className='text-destructive'
            >
              {editErrorCopy.title}
            </span>
          )}
        </div>
        <div className='flex gap-2 justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setEditing(false);
              setDraftBody(initialBody);
            }}
            disabled={isEditing}
            data-testid={`comment-edit-cancel-${commentId}`}
          >
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={!editValid || isEditing}
            onClick={handleSave}
            aria-busy={isEditing || undefined}
            data-testid={`comment-edit-save-${commentId}`}
          >
            {isEditing && <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={16} aria-hidden />}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn('inline-flex items-center gap-1', className)}
        data-testid={`comment-edit-actions-${commentId}`}
      >
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Edit comment'
          onClick={() => setEditing(true)}
          data-testid={`comment-edit-open-${commentId}`}
        >
          <Pencil size={16} aria-hidden />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Delete comment'
          onClick={() => setConfirmOpen(true)}
          data-testid={`comment-delete-open-${commentId}`}
        >
          <Trash2 size={16} aria-hidden />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        kind='destructive-permanent'
        entityLabel='this comment'
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isDeleting}
        data-testid={`comment-delete-confirm-${commentId}`}
      />

      {deleteErrorCopy && (
        <p
          role='alert'
          data-testid={`comment-delete-error-${commentId}`}
          className='text-xs text-destructive'
        >
          {deleteErrorCopy.title}: {deleteErrorCopy.body}
        </p>
      )}
    </>
  );
}