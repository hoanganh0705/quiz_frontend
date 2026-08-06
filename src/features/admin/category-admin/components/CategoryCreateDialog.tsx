'use client';

/**
 * `features/admin/category-admin/components/CategoryCreateDialog.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.E1.
 *
 * Dialog for creating a new category. Wraps `useCreateCategory` and
 * `CategoryFormFields` (create mode). On `CATEGORY_SLUG_CONFLICT`,
 * surfaces `CategorySlugConflictNotice` below the form with a
 * "Save with new slug" path.
 *
 * ## State machine
 *
 *   idle → pending → success | error
 *
 * On error the dialog stays open so the admin can read the request ID.
 * The parent closes the dialog on `onCreated(category)`.
 */

import { useCallback, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';
import { usePermission } from '@/features/admin/hooks';
import { PermissionDeniedNotice } from '@/features/admin/components/PermissionDeniedNotice';

import type { CategoryDto } from '../category-types';
import { CategoryFormFields } from './CategoryFormFields';
import { CategorySlugConflictNotice } from './CategorySlugConflictNotice';
import { useCreateCategory } from '../hooks/useCreateCategory';

export interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created category on success. */
  onCreated: (category: CategoryDto) => void;
}

const PERMISSION = 'category_create';

export function CategoryCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CategoryCreateDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);
  const { create, isPending, error, reset } = useCreateCategory();

  // Local form state — updated directly by input handlers.
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [renamedSlug, setRenamedSlug] = useState('');

  const isSlugConflict =
    error != null && (error as ApiError).code === 'CATEGORY_SLUG_CONFLICT';

  // canSubmit is computed from local state (not refs), which is always in sync
  // with the form inputs.
  const canSubmit =
    !isPending &&
    name.trim().length > 0 &&
    !isSlugConflict;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      try {
        // Only pass slug when the user has typed one (mirrors the
        // optional-slug semantics of `CategoryFormFields`).
        const input: { name: string; slug?: string } = { name };
        if (slug.trim().length > 0) {
          input.slug = slug;
        }
        const category = await create(input);
        onCreated(category);
        handleClose();
      } catch {
        // Dialog stays open; error rendered below.
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSubmit, create, name, slug, onCreated],
  );

  const handleConflictRename = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!renamedSlug.trim() || isPending) return;
      try {
        const category = await create({ name, slug: renamedSlug });
        onCreated(category);
        handleClose();
      } catch {
        // Dialog stays open.
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renamedSlug, isPending, create, name, onCreated],
  );

  const handleClose = useCallback(() => {
    reset();
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setRenamedSlug('');
    onOpenChange(false);
  }, [reset, onOpenChange]);

  if (!hasPermission) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <PermissionDeniedNotice variant='control' />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Add a new category to organise quizzes by topic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <CategoryFormFields
            mode='create'
            initialName={name}
            initialSlug={slug}
            initialDescription={description}
            initialImageUrl={imageUrl}
            onChange={(next) => {
              setName(next.name);
              setSlug(next.slug);
              setDescription(next.description);
              setImageUrl(next.imageUrl);
            }}
            disabled={isPending}
          />

          {error && !isSlugConflict && (
            <p className='text-sm text-destructive' role='alert'>
              {error.detail ?? 'An error occurred. Please try again.'}
            </p>
          )}

          {isSlugConflict && (
            <CategorySlugConflictNotice
              error={error as ApiError}
              mode='create'
              renamedSlug={renamedSlug}
              onRenamedSlugChange={setRenamedSlug}
            />
          )}

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            {isSlugConflict ? (
              <Button
                type='button'
                disabled={!renamedSlug.trim() || isPending}
                onClick={handleConflictRename}
              >
                {isPending ? 'Working…' : 'Save with new slug'}
              </Button>
            ) : (
              <Button type='submit' disabled={!canSubmit}>
                {isPending ? 'Creating…' : 'Create category'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}