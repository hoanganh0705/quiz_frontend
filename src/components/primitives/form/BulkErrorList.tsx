'use client';

/**
 * `<BulkErrorList />` — Phase 4 bulk-error renderer.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.D2.
 *
 * ## What this atom owns
 *
 *   - **Per-row error rendering** — each `BulkError` renders as a row
 *     with the index, the human-readable title (via
 *     `getUserCopy(code).title`), the `message`, and (when present)
 *     the failing field name in mono font.
 *   - **Re-submit failed CTA** — the "Re-submit failed only" button
 *     calls `onReSubmitFailed`. The parent owns the logic for
 *     extracting the failed rows from the bulk-error array (the atom
 *     does not know which row values belong to each index).
 *   - **Dismiss CTA** — the "Dismiss" button calls `onDismiss` (the
 *     parent typically calls `useQuizForm.reset()` to clear
 *     `bulkError`).
 *   - **A11y** — the list is announced as `role="list"`; each row is
 *     `role="listitem"`. Both CTAs are real `<button>` elements with
 *     `aria-label`.
 *
 * ## What this atom does NOT own
 *
 *   - **Re-submit logic.** The atom has no knowledge of which form
 *     row values belong to each `BulkError.index`. The parent wires
 *     the `onReSubmitFailed` callback to `bulkSubmit(failedRows)`.
 *   - **Editing the form.** The bulk-error UX rule (master plan
 *     line 259, 292) is "Per-item bulk errors render as a stacked
 *     list; the form remains editable". The form is rendered by the
 *     consumer; the renderer does not disable it.
 *   - **Field-level highlighting.** The form's `useQuizForm.bulkError`
 *     does not currently route individual field errors back into
 *     `formState.errors`; the renderer surfaces them inline only.
 *
 * ## Type-system contract
 *
 * `BulkError` is the same type `useQuizForm().bulkError` returns.
 * The renderer is a pure presentation component.
 */

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';
import { getUserCopy } from '@/lib/api/error-codes';
import type { BulkError } from '@/lib/forms/useQuizForm';

export interface BulkErrorListProps {
  /** Per-row errors from `useQuizForm().bulkError`. */
  bulkError: readonly BulkError[];
  /** Re-submit only the failed rows. The parent owns the row extraction. */
  onReSubmitFailed: () => void;
  /** Dismiss the bulk-error list (typically clears `bulkError`). */
  onDismiss: () => void;
  /** Optional className for the wrapping `<section>`. */
  className?: string;
  /** Override the default test id. */
  testId?: string;
}

/**
 * `<BulkErrorList bulkError onReSubmitFailed onDismiss />` — renders
 * one row per `BulkError` entry plus a "Re-submit failed only" CTA.
 * Returns `null` when `bulkError` is empty.
 */
export function BulkErrorList({
  bulkError,
  onReSubmitFailed,
  onDismiss,
  className,
  testId = 'bulk-error-list',
}: BulkErrorListProps): React.ReactElement | null {
  if (bulkError.length === 0) return null;

  return (
    <section
      role='alert'
      aria-label='Bulk submission errors'
      data-testid={testId}
      data-bulk-error-count={bulkError.length}
      className={cn(
        'rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm',
        className
      )}
    >
      <header className='flex items-center justify-between gap-2 mb-2'>
        <h2
          className='font-semibold flex items-center gap-2'
          data-testid={`${testId}-title`}
        >
          <AlertCircle
            className='h-4 w-4 text-destructive'
            aria-hidden='true'
          />
          {bulkError.length} {bulkError.length === 1 ? 'row' : 'rows'} failed
        </h2>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onDismiss}
            data-testid={`${testId}-dismiss`}
          >
            Dismiss
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={onReSubmitFailed}
            data-testid={`${testId}-resubmit-failed`}
          >
            Re-submit failed only
          </Button>
        </div>
      </header>
      <ol
        role='list'
        className='space-y-2'
        data-testid={`${testId}-items`}
      >
        {bulkError.map((err) => {
          const copy = getUserCopy(err.code);
          return (
            <li
              key={`${err.index}-${err.code}-${err.field ?? ''}`}
              role='listitem'
              data-testid={`${testId}-item-${err.index}`}
              className='flex items-start gap-2 rounded-md border border-destructive/20 bg-background p-2'
            >
              <Badge
                variant='destructive'
                className='shrink-0 font-mono'
                aria-label={`Row ${err.index}`}
              >
                #{err.index}
              </Badge>
              <div className='flex-1 space-y-0.5'>
                <p
                  className='font-medium'
                  data-testid={`${testId}-item-${err.index}-title`}
                >
                  {copy.title}
                </p>
                <p
                  className='text-xs text-muted-foreground'
                  data-testid={`${testId}-item-${err.index}-message`}
                >
                  {err.message}
                </p>
                {err.field ? (
                  <p
                    className='text-xs'
                    data-testid={`${testId}-item-${err.index}-field`}
                  >
                    <span className='text-muted-foreground'>Field: </span>
                    <code className='font-mono'>{err.field}</code>
                  </p>
                ) : null}
              </div>
              <span
                className='text-xs font-mono text-muted-foreground shrink-0'
                aria-label={`HTTP status ${err.status}`}
              >
                {err.status > 0 ? err.status : '—'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}