'use client';

/**
 * `<DraftBanner />` — restore-from-draft banner for authoring forms.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.C2.
 *
 * ## What this atom owns
 *
 *   - **Restore CTA** — when `savedAt` is non-null, the banner renders
 *     "Restore draft from <HH:MM>" with two buttons: `Restore` and
 *     `Dismiss`.
 *   - **Dismiss button** — calls `dismiss()` (parent deletes the
 *     snapshot without restoring).
 *   - **Restore button** — calls `restore()` (parent calls
 *     `form.reset(snapshot.values)`).
 *
 * The banner is a pure presentation component. It receives the
 * `savedAt`, `restore`, and `dismiss` callbacks as props so the
 * surrounding form owns the `useDraftAutoSave` hook lifecycle. This
 * avoids double-subscription to the form's `formState` Proxy when the
 * parent has already mounted `useDraftAutoSave` for the auto-save
 * interval side effect.
 *
 * ## What this atom does NOT own
 *
 *   - **Auto-save interval.** Mounted by the consumer via
 *     `useDraftAutoSave` (the parent owns the timer + storage writes).
 *   - **localStorage keying.** The parent decides the key via
 *     `useDraftAutoSave({ formId, userId, storage })`.
 *   - **Restored draft layout.** The banner only renders the prompt;
 *     the restored form is rendered by the consumer.
 *   - **Sensitive content.** Auth forms do not mount this banner.
 */

import * as React from 'react';
import { Save } from 'lucide-react';
import type { FieldValues } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

export interface DraftBannerProps<T extends FieldValues> {
  /** ISO timestamp of the saved snapshot, or `null` to hide the banner. */
  savedAt: string | null;
  /** Restore the form to the snapshot's values. */
  restore: () => void;
  /** Drop the snapshot without restoring. */
  dismiss: () => void;
  /**
   * When `false`, the banner hides regardless of `savedAt`. Useful for
   * consumers who mount `useDraftAutoSave` for auto-save but want the
   * restore CTA only when the form is clean.
   */
  showRestorePrompt?: boolean;
  /** Optional extra className for the wrapping `<div>`. */
  className?: string;
  /** Override the default test id. */
  testId?: string;
}

/**
 * Format an ISO timestamp as `HH:MM` in the local timezone. Falls back
 * to the raw timestamp when the input is empty.
 */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * `<DraftBanner savedAt restore dismiss />` — renders a "Restore
 * draft from HH:MM?" CTA when `savedAt` is non-null.
 */
export function DraftBanner<T extends FieldValues>(
  props: DraftBannerProps<T>
): React.ReactElement | null {
  const {
    savedAt,
    restore,
    dismiss,
    showRestorePrompt = true,
    className,
    testId = 'draft-banner',
  } = props;

  if (!savedAt || !showRestorePrompt) return null;

  return (
    <div
      role='status'
      aria-live='polite'
      data-testid={testId}
      className={cn(
        'flex items-center gap-2 rounded-md border border-info/40 bg-info/10 p-3 text-sm text-foreground',
        className
      )}
    >
      <Save className='h-4 w-4 shrink-0 text-info' aria-hidden='true' />
      <div className='flex-1'>
        <p className='font-medium' data-testid={`${testId}-message`}>
          Restore draft from {formatTime(savedAt)}?
        </p>
        <p className='text-xs text-muted-foreground'>
          We saved your progress to this browser. Pick up where you left off.
        </p>
      </div>
      <div className='flex items-center gap-1'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={dismiss}
          data-testid={`${testId}-dismiss`}
        >
          Dismiss
        </Button>
        <Button
          type='button'
          size='sm'
          onClick={restore}
          data-testid={`${testId}-restore`}
        >
          Restore
        </Button>
      </div>
    </div>
  );
}