'use client';

/**
 * `features/admin/tag-admin/components/TagCreateDialog.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.E1.
 *
 * ## Purpose
 *
 * Dialog for creating a new tag. Wraps `useCreateTag` and `TagFormFields`
 * (create mode). On `TAG_SLUG_CONFLICT`, surfaces `SlugConflictNotice`
 * below the form with a "Save with new slug" path.
 *
 * ## State machine
 *
 *   idle → pending → success | error
 *
 * On error the dialog stays open so the admin can read the request ID.
 * The parent closes the dialog on `onCreated(tag)`.
 */

import { useCallback, useRef, useState } from 'react';

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

import type { TagDto } from '../tag-types';
import { TagFormFields } from './TagFormFields';
import { SlugConflictNotice } from './SlugConflictNotice';
import { useCreateTag } from '../hooks/useCreateTag';

export interface TagCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created tag on success. */
  onCreated: (tag: TagDto) => void;
}

const PERMISSION = 'tag_create';

export function TagCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: TagCreateDialogProps) {
  const { hasPermission } = usePermission(PERMISSION);
  const { create, isPending, error, reset } = useCreateTag();

  // Local form state — updated directly by input handlers.
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [renamedSlug, setRenamedSlug] = useState('');

  const isSlugConflict =
    error != null && (error as ApiError).code === 'TAG_SLUG_CONFLICT';

  // canSubmit is computed from local state (not refs), which is always in sync
  // with the form inputs.
  const canSubmit =
    !isPending &&
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    !isSlugConflict;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      try {
        const tag = await create({ name, slug });
        onCreated(tag);
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
        const tag = await create({ name, slug: renamedSlug });
        onCreated(tag);
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
          <DialogTitle>Create Tag</DialogTitle>
          <DialogDescription>
            Add a new tag to organise quizzes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <TagFormFields
            mode='create'
            initialName={name}
            initialSlug={slug}
            onChange={(next) => {
              setName(next.name);
              setSlug(next.slug);
            }}
            disabled={isPending}
          />

          {error && !isSlugConflict && (
            <p className='text-sm text-destructive' role='alert'>
              {error.detail ?? 'An error occurred. Please try again.'}
            </p>
          )}

          {isSlugConflict && (
            <SlugConflictNotice
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
                {isPending ? 'Creating…' : 'Create tag'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
