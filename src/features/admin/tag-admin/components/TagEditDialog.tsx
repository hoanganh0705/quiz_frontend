'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
import { useUpdateTag } from '../hooks/useUpdateTag';

export interface TagEditDialogProps {
open: boolean;
onOpenChange: (open: boolean) => void;

tag: TagDto | null;

onUpdated: (tag: TagDto) => void;
}

const PERMISSION = 'tag_update';

export function TagEditDialog({
open,
onOpenChange,
tag,
onUpdated,
}: TagEditDialogProps) {
const { hasPermission } = usePermission(PERMISSION);
const { update, isPending, error, reset } = useUpdateTag();

const [name, setName] = useState(tag?.name ?? '');
const [slug, setSlug] = useState(tag?.slug ?? '');
const [renamedSlug, setRenamedSlug] = useState('');
const prevTagIdRef = useRef<string | null>(tag?.tagId ?? null);

useEffect(() => {
if (tag !== null && tag.tagId !== prevTagIdRef.current) {
prevTagIdRef.current = tag.tagId;
setName(tag.name);
setSlug(tag.slug);
setRenamedSlug('');
reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag?.tagId]);

const isSlugConflict =
error != null && (error as ApiError).code === 'TAG_SLUG_CONFLICT';
const isNotFound =
error != null && (error as ApiError).code === 'TAG_NOT_FOUND';

const canSubmit =
!isPending &&
name.trim().length > 0 &&
slug.trim().length > 0 &&
!isSlugConflict;

const handleSubmit = useCallback(
async (e: React.FormEvent) => {
e.preventDefault();
if (!canSubmit || tag === null) return;
try {
const updated = await update(tag.tagId, { name, slug });
onUpdated(updated);
handleClose();
      } catch {
        // Dialog stays open; error rendered below.
      }
    },

[canSubmit, update, tag, name, slug, onUpdated],
  );

const handleConflictRename = useCallback(
async (e: React.FormEvent) => {
e.preventDefault();
if (!renamedSlug.trim() || isPending || tag === null) return;
try {
const updated = await update(tag.tagId, { name, slug: renamedSlug });
onUpdated(updated);
handleClose();
      } catch {
        // Dialog stays open.
      }
    },

[renamedSlug, isPending, update, tag, name, onUpdated],
  );

const handleClose = useCallback(() => {
reset();
setName('');
setSlug('');
setRenamedSlug('');
prevTagIdRef.current = null;
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

if (tag === null) {
return null;
  }

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className='sm:max-w-md'>
<DialogHeader>
<DialogTitle>Edit Tag</DialogTitle>
<DialogDescription>
Update the name or slug of this tag.
          </DialogDescription>
</DialogHeader>

<form onSubmit={handleSubmit} className='space-y-4'>
{isNotFound && (
<p className='text-sm text-destructive' role='alert'>
This tag no longer exists. It may have been deleted.
            </p>
          )}

<TagFormFields
mode='edit'
initialName={name}
initialSlug={slug}
excludeTagId={tag.tagId}
onChange={(next) => {
setName(next.name);
setSlug(next.slug);
            }}
disabled={isPending || isNotFound}
          />

{error && !isSlugConflict && !isNotFound && (
<p className='text-sm text-destructive' role='alert'>
{error.detail ?? 'An error occurred. Please try again.'}
</p>
          )}

{isSlugConflict && (
<SlugConflictNotice
error={error as ApiError}
mode='edit'
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
<Button type='submit' disabled={!canSubmit || isNotFound}>
{isPending ? 'Saving…' : 'Save changes'}
</Button>
            )}
</DialogFooter>
</form>
</DialogContent>
</Dialog>
  );
}
