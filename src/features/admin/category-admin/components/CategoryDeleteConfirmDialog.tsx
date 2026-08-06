'use client';

/**
 * `features/admin/category-admin/components/CategoryDeleteConfirmDialog.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.E3.
 *
 * Confirmation dialog for soft-deleting a category. Since soft-delete is
 * reversible (categories can be restored), this dialog uses a plain
 * confirm button without the typed-confirm ceremony.
 *
 * The destructive action is wrapped in `AuditActionShell` so the
 * Phase 7.1 audit trail captures the `before` snapshot and the
 * success / failure breadcrumb with correlation IDs and request IDs.
 * The hook (`useDeleteCategory`) also emits its own breadcrumbs; the
 * shell's breadcrumbs are additive so the Sentry replay includes both
 * layers.
 */

import { useCallback } from 'react';

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
import { AuditActionShell } from '@/features/admin/components/AuditActionShell';
import { deleteCategory } from '@/features/admin/services/category-admin.service';
import { ApiError } from '@/lib/api';

import type { CategoryListItem } from '../category-types';

export interface CategoryDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category to delete. `null` means closed. */
  category: CategoryListItem | null;
  /** Called with the deleted category id on success. */
  onDeleted: (id: string) => void;
}

const PERMISSION = 'category_delete';

export function CategoryDeleteConfirmDialog({
  open,
  onOpenChange,
  category,
  onDeleted,
}: CategoryDeleteConfirmDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);

  const handleShellComplete = useCallback(
    (result: unknown) => {
      if (category === null) return;
      // The shell resolves with the mutate() return value. Our service
      // wraps the DELETE in a no-content response; we treat any
      // resolved value as success.
      if (result !== undefined) {
        onDeleted(category.categoryId);
        onOpenChange(false);
      }
    },
    [category, onDeleted, onOpenChange],
  );

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
            <Trash2Icon className='h-5 w-5 text-destructive' />
            Delete category
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to soft-delete &ldquo;{category.name}
            &rdquo;? You can restore it from the soft-deleted tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AuditActionShell
          action='category.delete'
          before={{ categoryId: category.categoryId, name: category.name }}
          mutate={async () => {
            await deleteCategory(category.categoryId);
            return category.categoryId;
          }}
        >
          {(state) => (
            <>
              {state.error != null && state.error instanceof ApiError ? (
                <p
                  className='text-xs text-muted-foreground'
                  role='status'
                >
                  Request ID: {state.error.requestId ?? 'n/a'}
                </p>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel type='button' asChild>
                  <Button variant='outline' disabled={state.isPending}>
                    Cancel
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant='destructive'
                    onClick={async () => {
                      try {
                        const result = await state.retry();
                        handleShellComplete(result);
                      } catch {
                        // Surfaced via the shell's `state.error`.
                      }
                    }}
                    disabled={state.isPending}
                  >
                    <Trash2Icon className='h-4 w-4' />
                    {state.isPending ? 'Deleting…' : 'Delete category'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AuditActionShell>
      </AlertDialogContent>
    </AlertDialog>
  );
}