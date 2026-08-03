'use client';

/**
 * `<FormErrorBanner />` — Phase 4 form-level error banner.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.C1.
 *
 * ## What this atom owns
 *
 *   - **Top-of-form banner** that renders `useQuizForm().lastError`'s
 *     `title` + `body` (the `UserCopyEntry` from `getUserCopy(code)`).
 *   - **`toast` placement hint** — each `USER_COPY` entry declares
 *     `toast: 'inline' | 'top' | 'silent'`. The banner respects the
 *     hint:
 *     - `'inline'` → renders the banner inline (the default visible
 *       surface).
 *     - `'top'`    → renders the banner inline AND dispatches a top-of-page
 *       toast via `useToast()` (TKT-4.2.C1 infrastructure) so the
 *       user sees the error regardless of scroll position.
 *     - `'silent'` → renders nothing; the error is observable elsewhere
 *       (e.g. inline field errors).
 *   - **Dismiss button** — clicking it calls `onDismiss` (the parent
 *     owns `lastError` via `useQuizForm`, so the parent calls
 *     `useQuizForm.reset()` or `setLastError(null)` via the form's
 *     reset path).
 *
 * ## What this atom does NOT own
 *
 *   - **Error classification.** The submission-error → `lastError`
 *     pipeline lives in `useQuizForm.submit()` (TKT-4.2.A3). The
 *     banner is a pure presentation layer.
 *   - **Inline field errors.** Those are owned by each atom
 *     (`<TextField />`, `<RichTextArea />`, …) via `useController`'s
 *     `fieldState.error`.
 *   - **Toast viewport.** The viewport is `<ToastProvider />` from
 *     `lib/forms/useToast.tsx`. The provider is mounted once at the
 *     app root; the banner only reads its context.
 *
 * ## Type-system contract
 *
 * The `lastError` prop is typed as the `useQuizForm` return shape's
 * `lastError` field (`UserCopyEntry & { code: string } | null`). The
 * `onDismiss` callback is required (the parent owns the state).
 */

import * as React from 'react';
import { AlertCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';

export interface FormErrorBannerProps {
  /**
   * The `lastError` value from `useQuizForm().lastError`. `null` (or
   * an entry whose `toast === 'silent'`) renders nothing.
   */
  lastError:
    | {
        title: string;
        body: string;
        toast?: 'inline' | 'top' | 'silent';
        code: string;
      }
    | null;
  /** Fired when the user clicks the dismiss (×) button. */
  onDismiss: () => void;
  /** Optional className appended to the wrapping `<div>`. */
  className?: string;
  /** Optional test id for the banner root. */
  testId?: string;
}

/**
 * `<FormErrorBanner lastError onDismiss />` — renders the banner
 * inline when `lastError.toast === 'inline' | 'top'`, and dispatches
 * a top-of-page toast when `lastError.toast === 'top'`. Silent
 * errors render nothing.
 */
export function FormErrorBanner({
  lastError,
  onDismiss,
  className,
  testId = 'form-error-banner',
}: FormErrorBannerProps): React.ReactElement | null {
  const toast = useToast();
  const lastPushedCodeRef = React.useRef<string | null>(null);

  // Dispatch a top-of-page toast whenever the active `lastError` is
  // a brand-new `'top'` error. The ref prevents re-dispatch on every
  // render (e.g. when the parent re-renders after a state change).
  React.useEffect(() => {
    if (!lastError || lastError.toast !== 'top') {
      lastPushedCodeRef.current = null;
      return;
    }
    if (lastPushedCodeRef.current === lastError.code) return;
    lastPushedCodeRef.current = lastError.code;
    toast.push({
      title: lastError.title,
      body: lastError.body,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
  }, [lastError, toast]);

  if (!lastError || lastError.toast === 'silent') {
    return null;
  }

  return (
    <div
      role='alert'
      aria-live='assertive'
      data-testid={testId}
      data-form-error-banner-code={lastError.code}
      className={cn(
        'flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive',
        className
      )}
    >
      <AlertCircle
        className='h-4 w-4 mt-0.5 shrink-0'
        aria-hidden='true'
      />
      <div className='flex-1 space-y-1'>
        <p className='font-semibold leading-none' data-testid={`${testId}-title`}>
          {lastError.title}
        </p>
        <p className='text-xs text-destructive/90' data-testid={`${testId}-body`}>
          {lastError.body}
        </p>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        aria-label='Dismiss error'
        onClick={onDismiss}
        className='h-6 w-6 text-destructive hover:bg-destructive/20'
        data-testid={`${testId}-dismiss`}
      >
        <X className='h-4 w-4' aria-hidden='true' />
      </Button>
    </div>
  );
}
