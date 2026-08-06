'use client';

/**
 * `features/admin/category-admin/components/CategorySlugConflictNotice.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.D2.
 *
 * Category-specific adapter over Epic 7.3's `SlugConflictNotice`
 * (TKT-7.3.D2). The underlying RFC 7807 `extensions.conflictingCategoryId`
 * payload shape is structurally identical to the tag payload, but
 * the copy / prop names must reference "category" so dialog copy is
 * consistent.
 *
 * The component is controlled: the dialog owns the `renamedSlug` state
 * and re-issues the mutation on form submit.
 *
 * The component does NOT retry on its own.
 */

import { useId } from 'react';

import { ApiError } from '@/lib/api';

import {
  SlugConflictNotice,
  type SlugConflictNoticeProps,
} from '@/features/admin/tag-admin/components/SlugConflictNotice';

export interface CategorySlugConflictNoticeProps
  extends Omit<SlugConflictNoticeProps, 'conflictingTagName'> {
  /** Optional name of the conflicting category, if the error payload exposes it. */
  conflictingCategoryName?: string;
}

/**
 * Extracts the `conflictingCategoryId` from the error's RFC 7807
 * extensions.
 *
 * The error body shape for `CATEGORY_SLUG_CONFLICT` is:
 * ```
 * { extensions: { code: 'CATEGORY_SLUG_CONFLICT', conflictingCategoryId?: string } }
 * ```
 * The field may not always be present; the getter returns undefined
 * in that case.
 */
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