'use client';

/**
 * `features/admin/category-admin/components/CategoryRestoreDialog.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.E4.
 *
 * Dialog for restoring a soft-deleted category. Wraps
 * `useRestoreCategory` and surfaces `CategorySlugConflictNotice` on
 * `CATEGORY_SLUG_CONFLICT`. On `CATEGORY_ALREADY_ACTIVE` or
 * `CATEGORY_RESTORE_INVARIANT`, renders a stable notice without retry.
 *
 * Uses `AlertDialog` with a plain confirm (non-typed, since restore is
 * reversible).
 *
 * ## Audit trail
 *
 * `useRestoreCategory` (TKT-7.4.C5) emits its own `phase7:admin`
 * `started` / `success` / `failure` breadcrumbs via the
 * `addCategoryAdminBreadcrumb` helper. The dialog therefore wraps the
 * mutation through the hook rather than re-wrapping it in
 * `AuditActionShell` — double-wrapping would emit two layers of
 * breadcrumbs for the same action. The hook's breadcrumb payload
 * already satisfies the audit-trail requirement documented in
 * `EPIC_7_4_TICKETS.md` TKT-7.4.E4.
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

import type { CategoryDto, DeletedCategoryListItem } from '../category-types';
import { useRestoreCategory } from '../hooks/useRestoreCategory';
import { CategorySlugConflictNotice } from './CategorySlugConflictNotice';

export interface CategoryRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The soft-deleted category to restore. `null` means closed. */
  category: DeletedCategoryListItem | null;
  /** Called with the restored category on success. */
  onRestored: (category: CategoryDto) => void;
}

const PERMISSION = 'category_restore';

export function CategoryRestoreDialog({
  open,
  onOpenChange,
  category,
  onRestored,
}: CategoryRestoreDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);
  const { restore, isPending, error, reset } = useRestoreCategory();

  const [renamedSlug, setRenamedSlug] = useState('');

  const isSlugConflict =
    error != null && (error as ApiError).code === 'CATEGORY_SLUG_CONFLICT';
  const isAlreadyActive =
    error != null && (error as ApiError).code === 'CATEGORY_ALREADY_ACTIVE';
  const isInvariant =
    error != null && (error as ApiError).code === 'CATEGORY_RESTORE_INVARIANT';

  const isStableError = isAlreadyActive || isInvariant;

  const handleConfirm = useCallback(async () => {
    if (category === null) return;
    try {
      const restored = await restore(category.categoryId);
      onRestored(restored);
      onOpenChange(false);
    } catch {
      // Error is surfaced below; dialog stays open.
    }
  }, [category, restore, onRestored, onOpenChange]);

  const handleConflictRename = useCallback(async () => {
    if (category === null || !renamedSlug.trim() || isPending) return;
    try {
      const restored = await restore(category.categoryId, { renamedSlug });
      onRestored(restored);
      onOpenChange(false);
    } catch {
      // Error surfaced below.
    }
  }, [category, renamedSlug, isPending, restore, onRestored, onOpenChange]);

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

  if (category === null) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <RotateCcwIcon className='h-5 w-5' />
            Restore category
          </AlertDialogTitle>
          <AlertDialogDescription>
            Restore &ldquo;{category.name}&rdquo;? It will appear in the
            active list again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Stable errors — no retry path. */}
        {isStableError && (
          <p className='text-sm text-muted-foreground' role='status'>
            {isAlreadyActive
              ? 'This category is already active and cannot be restored.'
              : 'This category cannot be restored due to a system constraint.'}
          </p>
        )}

        {/* Request ID on errors that have one. */}
        {error != null && (error as ApiError).requestId ? (
          <RequestIdBanner error={error as ApiError} />
        ) : null}

        {/* Slug conflict rename section. */}
        {isSlugConflict && (
          <CategorySlugConflictNotice
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
                    : 'Restore category'}
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}