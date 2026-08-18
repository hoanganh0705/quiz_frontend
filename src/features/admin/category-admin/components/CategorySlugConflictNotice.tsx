'use client';

import { useId } from 'react';

import { ApiError } from '@/lib/api';

import {
SlugConflictNotice,
type SlugConflictNoticeProps,
} from '@/features/admin/tag-admin/components/SlugConflictNotice';

export interface CategorySlugConflictNoticeProps
extends Omit<SlugConflictNoticeProps, 'conflictingTagName'> {

conflictingCategoryName?: string;
}

function getConflictingCategoryId(error: ApiError): string | undefined {
return (
error as unknown as {
data?: { extensions?: { conflictingCategoryId?: string } };
    }
  ).data?.extensions?.conflictingCategoryId;
}

export function CategorySlugConflictNotice({
error,
mode,
renamedSlug,
onRenamedSlugChange,
conflictingCategoryName,
disabled = false,
}: CategorySlugConflictNoticeProps) {
const inputId = useId();
const requestId = error.requestId;
const conflictingCategoryId = getConflictingCategoryId(error);

return (
<div className='space-y-4'>
<SlugConflictNotice
error={error}
mode={mode}
renamedSlug={renamedSlug}
onRenamedSlugChange={onRenamedSlugChange}
disabled={disabled}
conflictingTagName={conflictingCategoryName}
      />
{conflictingCategoryId && (
<p className='text-xs text-muted-foreground'>
Conflicting category ID: {conflictingCategoryId}
</p>
      )}
{/* Render an inputId-bound hidden marker so testID selectors can
          target the rename input; the underlying SlugConflictNotice
          owns the actual input. */}
<input type='hidden' id={inputId} value={renamedSlug} readOnly />
{requestId && (
<p className='text-xs text-muted-foreground'>
Request ID: {requestId}
</p>
      )}
</div>
  );
}