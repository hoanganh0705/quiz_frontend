'use client';

/**
 * `features/admin/tag-admin/components/SlugConflictNotice.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D2.
 *
 * ## Purpose
 *
 * Renders when a mutation (`create` or `restore`) returns `TAG_SLUG_CONFLICT`.
 * Displays the conflicting tag's name and slug, renders a rename input,
 * and surfaces `RequestIdBanner` if the error carries a `requestId`.
 *
 * The component is controlled: the dialog owns the `renamedSlug` state and
 * re-issues the mutation on form submit.
 *
 * The component does NOT retry on its own.
 */

import { useId } from 'react';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import type { ApiError } from '@/lib/api';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

export interface SlugConflictNoticeProps {
  /** The `TAG_SLUG_CONFLICT` error from the typed `ApiError`. */
  error: ApiError;
  /**
   * The mode determines the CTA copy:
   *   - `'create'` — "choose a different slug" (the tag-create context).
   *   - `'edit'`   — "choose a different slug" (the tag-edit context; same UX as create).
   *   - `'restore'` — "rename before restoring" (the tag-restore context).
   */
  mode: 'create' | 'edit' | 'restore';
  /** Current value of the rename input. */
  renamedSlug: string;
  /** Fires on every rename input change. */
  onRenamedSlugChange: (slug: string) => void;
  /**
   * Optional name of the conflicting tag, if the error payload exposes it.
   * Used to render "taken by 'Math'" instead of just "slug is taken".
   */
  conflictingTagName?: string;
  disabled?: boolean;
}
/**
 * Extracts the `conflictingTagId` from the error's RFC 7807 extensions.
 *
 * The error body shape for `TAG_SLUG_CONFLICT` is:
 * ```
 * { extensions: { code: 'TAG_SLUG_CONFLICT', conflictingTagId?: string } }
 * ```
 * The field may not always be present; the getter returns undefined in that case.
 */
function getConflictingTagId(error: ApiError): string | undefined {
  return (error as unknown as { data?: { extensions?: { conflictingTagId?: string } } })
    .data?.extensions?.conflictingTagId;
}

export function SlugConflictNotice({
  error,
  mode,
  renamedSlug,
  onRenamedSlugChange,
  conflictingTagName,
  disabled = false,
}: SlugConflictNoticeProps) {
  const inputId = useId();
  const requestId = error.requestId;
  const conflictingTagId = getConflictingTagId(error);

  return (
    <div className='space-y-4'>
      {/* Warning banner */}
      <div
        className='flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
        role='alert'
      >
        <AlertTriangle className='h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5' aria-hidden />
        <div className='space-y-1'>
          <p className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
            {mode === 'restore'
              ? 'Slug conflict — rename before restoring'
              : 'Slug is already taken'}
          </p>
          {conflictingTagName ? (
            <p className='text-xs text-yellow-700 dark:text-yellow-300'>
              The slug &ldquo;{renamedSlug || '(pending)'}&rdquo; is taken by{' '}
              <strong>{conflictingTagName}</strong>.
            </p>
          ) : (
            <p className='text-xs text-yellow-700 dark:text-yellow-300'>
              Choose a different slug to continue.
            </p>
          )}
          {conflictingTagId && (
            <p className='text-xs text-yellow-600 dark:text-yellow-400'>
              Conflicting tag ID: {conflictingTagId}
            </p>
          )}
        </div>
      </div>

      {/* Rename input */}
      <div className='space-y-2'>
        <Label htmlFor={inputId}>
          {mode === 'restore' ? 'New slug' : 'Choose a slug'}
        </Label>
        <div className='flex gap-2'>
          <Input
            id={inputId}
            type='text'
            value={renamedSlug}
            onChange={(e) => onRenamedSlugChange(e.target.value)}
            disabled={disabled}
            placeholder='e.g. javascript-basics-alt'
            aria-describedby={`${inputId}-hint`}
            className='flex-1'
          />
          <Button
            variant='outline'
            disabled={disabled || !renamedSlug.trim()}
            title='Auto-derive slug from the original tag name'
            aria-label='Derive a new slug automatically'
          >
            <RefreshCw className='h-4 w-4' aria-hidden />
          </Button>
        </div>
        <p id={`${inputId}-hint`} className='text-xs text-muted-foreground'>
          Use lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      {/* Request ID correlation */}
      {requestId && (
        <RequestIdBanner error={error} />
      )}
    </div>
  );
}
