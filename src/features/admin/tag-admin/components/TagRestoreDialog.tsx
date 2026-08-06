'use client';

/**
 * `features/admin/tag-admin/components/TagRestoreDialog.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.E4.
 *
 * ## Purpose
 *
 * Dialog for restoring a soft-deleted tag. Wraps `useRestoreTag` and
 * surfaces `SlugConflictNotice` on `TAG_SLUG_CONFLICT`. On `TAG_ALREADY_ACTIVE`
 * or `TAG_RESTORE_INVARIANT`, renders a stable notice without retry.
 * Uses `AlertDialog` with a plain confirm (non-typed, since restore is reversible).
 */

import { useCallback, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { RotateCcwIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { usePermission } from '@/features/admin/hooks';
import { PermissionDeniedNotice } from '@/features/admin/components/PermissionDeniedNotice';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import type { TagDto, DeletedTagListItem } from '../tag-types';
import { useRestoreTag } from '../hooks/useRestoreTag';
import { SlugConflictNotice } from './SlugConflictNotice';

export interface TagRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The soft-deleted tag to restore. `null` means closed. */
  tag: DeletedTagListItem | null;
  /** Called with the restored tag on success. */
  onRestored: (tag: TagDto) => void;
}

const PERMISSION = 'tag_restore';

export function TagRestoreDialog({
  open,
  onOpenChange,
  tag,
  onRestored,
}: TagRestoreDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);
  const { restore, isPending, error, reset } = useRestoreTag();

  const [renamedSlug, setRenamedSlug] = useState('');

  const isSlugConflict =
    error != null && (error as ApiError).code === 'TAG_SLUG_CONFLICT';
  const isAlreadyActive =
    error != null && (error as ApiError).code === 'TAG_ALREADY_ACTIVE';
  const isInvariant =
    error != null && (error as ApiError).code === 'TAG_RESTORE_INVARIANT';

  const isStableError = isAlreadyActive || isInvariant;

  const handleConfirm = useCallback(async () => {
    if (tag === null) return;
    try {
      const restored = await restore(tag.tagId);
      onRestored(restored);
      onOpenChange(false);
    } catch {
      // Error is surfaced below; dialog stays open.
    }
  }, [tag, restore, onRestored, onOpenChange]);

  const handleConflictRename = useCallback(async () => {
    if (tag === null || !renamedSlug.trim() || isPending) return;
    try {
      const restored = await restore(tag.tagId, { renamedSlug });
      onRestored(restored);
      onOpenChange(false);
    } catch {
      // Error surfaced below.
    }
  }, [tag, renamedSlug, isPending, restore, onRestored, onOpenChange]);

  const handleClose = useCallback(() => {
    reset();
    setRenamedSlug('');
    onOpenChange(false);
  }, [reset, onOpenChange]);

  if (!hasPermission) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <PermissionDeniedNotice variant='control' />
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (tag === null) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <RotateCcwIcon className='h-5 w-5' />
            Restore tag
          </AlertDialogTitle>
          <AlertDialogDescription>
            Restore &ldquo;{tag.name}&rdquo;? It will appear in the
            active list again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Stable errors — no retry path. */}
        {isStableError && (
          <p className='text-sm text-muted-foreground' role='status'>
            {isAlreadyActive
              ? 'This tag is already active and cannot be restored.'
              : 'This tag cannot be restored due to a system constraint.'}
          </p>
        )}

        {/* Request ID on errors that have one. */}
        {error != null && (error as ApiError).requestId ? (
          <RequestIdBanner error={error as ApiError} />
        ) : null}

        {/* Slug conflict rename section. */}
        {isSlugConflict && (
          <SlugConflictNotice
            error={error as ApiError}
            mode='restore'
            renamedSlug={renamedSlug}
            onRenamedSlugChange={setRenamedSlug}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel type='button' asChild>
            <Button variant='outline' onClick={handleClose} disabled={isPending}>
              {isStableError ? 'Close' : 'Cancel'}
            </Button>
          </AlertDialogCancel>
          {!isStableError && (
            <AlertDialogAction asChild>
              <Button
                variant='default'
                onClick={isSlugConflict ? handleConflictRename : handleConfirm}
                disabled={isPending || (isSlugConflict && !renamedSlug.trim())}
              >
                <RotateCcwIcon className='h-4 w-4' />
                {isPending
                  ? 'Restoring…'
                  : isSlugConflict
                    ? 'Restore with new slug'
                    : 'Restore tag'}
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
