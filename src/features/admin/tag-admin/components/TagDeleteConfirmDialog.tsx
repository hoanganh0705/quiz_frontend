'use client';

/**
 * `features/admin/tag-admin/components/TagDeleteConfirmDialog.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.E3.
 *
 * ## Purpose
 *
 * Confirmation dialog for soft-deleting a tag. Manages pending/error state
 * directly and emits audit breadcrumbs for started / success / failure.
 * Since soft-delete is reversible (tags can be restored), this dialog
 * uses a plain confirm button without the typed-confirm ceremony.
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
import { Trash2Icon } from 'lucide-react';
import { usePermission } from '@/features/admin/hooks';
import { PermissionDeniedNotice } from '@/features/admin/components/PermissionDeniedNotice';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';
import { ApiError } from '@/lib/api';

import type { TagListItem } from '../tag-types';
import { useDeleteTag } from '../hooks/useDeleteTag';

export interface TagDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tag to delete. `null` means closed. */
  tag: TagListItem | null;
  /** Called with the deleted tag id on success. */
  onDeleted: (id: string) => void;
}

const PERMISSION = 'tag_delete';

export function TagDeleteConfirmDialog({
  open,
  onOpenChange,
  tag,
  onDeleted,
}: TagDeleteConfirmDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);
  const { remove, isPending, error } = useDeleteTag();

  const handleConfirm = useCallback(async () => {
    if (tag === null) return;
    try {
      await remove(tag.tagId);
      onDeleted(tag.tagId);
      onOpenChange(false);
    } catch {
      // Error is surfaced in the dialog; dialog stays open.
    }
  }, [tag, remove, onDeleted, onOpenChange]);

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
            <Trash2Icon className='h-5 w-5 text-destructive' />
            Delete tag
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to soft-delete &ldquo;{tag.name}&rdquo;?
            You can restore it from the soft-deleted tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error != null && (error as ApiError).requestId ? (
          <RequestIdBanner error={error as ApiError} />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel type='button' asChild>
            <Button variant='outline' disabled={isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant='destructive'
              onClick={handleConfirm}
              disabled={isPending}
            >
              <Trash2Icon className='h-4 w-4' />
              {isPending ? 'Deleting…' : 'Delete tag'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
