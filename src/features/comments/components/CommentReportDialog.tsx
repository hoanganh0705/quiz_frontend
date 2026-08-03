'use client';

/**
 * `CommentReportDialog` — modal for submitting a comment report.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.12.
 *
 * Built on the existing `<AlertDialog>` primitive (Phase 1 / Story
 * 3.1), with the same `role="alertdialog"`, focus trap, ESC handling,
 * and backdrop-click dismissal that the rest of the design system
 * uses. The dialog is intentionally custom (not the `<ConfirmDialog>`
 * primitive from Epic 4.1) because the report form has multi-field
 * input rather than a single confirm action.
 *
 * ## Reasons
 *
 * The five reasons enumerated in the spec (master plan line 229):
 *
 *   - `spam`
 *   - `harassment`
 *   - `hate_speech`
 *   - `misinformation`
 *   - `other`
 *
 * The optional `description` field accepts 1-500 chars; the dialog
 * shows a live character counter.
 *
 * ## Error handling
 *
 * - `COMMENT_DUPLICATE_REPORT` (409) → renders an inline info message
 *   "You've already reported this comment" and KEEPS the dialog open
 *   so the user can dismiss it manually.
 * - Any other ApiError → renders the toast via `getUserCopy(err.code)`
 *   inside the dialog (the user retries from the same dialog).
 *
 * The dialog is owner-aware: callers pass `isOwner`. When true, the
 * opener should not show the report trigger at all (defense in depth —
 * the hook also handles the typed error gracefully).
 *
 * ## Form reset
 *
 * The form is mounted inside an inner component keyed by `isOpen` so
 * closing and re-opening the dialog fully resets the fields without
 * triggering `setState` inside an effect.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';

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
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { useReportComment } from '@/features/comments/hooks/useReportComment';

// ─── Reason enum ──────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const MAX_DESCRIPTION = 500;

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentReportDialogProps {
  commentId: string;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional callback fired when the report succeeds (or is
   * reconciled as already-reported). The dialog auto-closes on
   * plain success; the parent may also close manually via
   * `onClose`.
   */
  onReported?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CommentReportDialog({
  commentId,
  isOpen,
  onClose,
  onReported,
}: CommentReportDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Key by `isOpen` so the inner content remounts on every
          open — giving us a clean form-state reset for free. */}
      {isOpen && (
        <CommentReportDialogBody
          commentId={commentId}
          onClose={onClose}
          onReported={onReported}
        />
      )}
    </AlertDialog>
  );
}

// ─── Inner body ───────────────────────────────────────────────────────────

interface CommentReportDialogBodyProps {
  commentId: string;
  onClose: () => void;
  onReported?: () => void;
}

function CommentReportDialogBody({
  commentId,
  onClose,
  onReported,
}: CommentReportDialogBodyProps) {
  const titleId = useId();
  const descriptionId = useId();

  const { report, isLoading, reported, isAlreadyReported, error } =
    useReportComment(commentId);

  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');

  // Auto-close on plain success (not duplicate-report).
  useEffect(() => {
    if (reported && !isAlreadyReported) {
      onReported?.();
      // Defer close so the toast can render.
      const t = setTimeout(() => onClose(), 100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [reported, isAlreadyReported, onReported, onClose]);

  const trimmedDescription = description.trim();
  const descriptionValid =
    trimmedDescription.length === 0 || trimmedDescription.length <= MAX_DESCRIPTION;
  const submitDisabled = reason === '' || !descriptionValid || isLoading;

  const submitCopy = useMemo(() => {
    if (error && isApiError(error)) {
      return getUserCopy(error.code);
    }
    return null;
  }, [error]);

  const handleSubmit = () => {
    if (submitDisabled) return;
    void report({
      reason,
      description: trimmedDescription === '' ? undefined : trimmedDescription,
    });
  };

  return (
    <AlertDialogContent
      className='sm:max-w-md'
      data-testid={`comment-report-dialog-${commentId}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <AlertDialogHeader>
        <AlertDialogTitle id={titleId}>Report Comment</AlertDialogTitle>
        <AlertDialogDescription id={descriptionId}>
          Tell us why this comment should be reviewed. A moderator
          will look at it as soon as possible.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className='flex flex-col gap-3'>
        <label
          htmlFor={`comment-report-reason-${commentId}`}
          className='text-sm font-medium'
        >
          Reason
        </label>
        <select
          id={`comment-report-reason-${commentId}`}
          data-testid={`comment-report-reason-${commentId}`}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value as ReportReason | '')}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
            'outline-none focus-visible:border-default focus-visible:ring-1 focus-visible:ring-ring/50',
          )}
          required
        >
          <option value='' disabled>
            Select a reason
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <label
          htmlFor={`comment-report-description-${commentId}`}
          className='text-sm font-medium'
        >
          Additional details (optional)
        </label>
        <Textarea
          id={`comment-report-description-${commentId}`}
          data-testid={`comment-report-description-${commentId}`}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          placeholder='Add context for the moderator (1-500 characters).'
          rows={4}
          maxLength={MAX_DESCRIPTION}
        />
        <div
          className={cn(
            'flex justify-end text-xs tabular-nums',
            trimmedDescription.length > MAX_DESCRIPTION
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
          aria-live='polite'
        >
          {trimmedDescription.length} / {MAX_DESCRIPTION}
        </div>
      </div>

      {isAlreadyReported && (
        <div
          role='status'
          data-testid={`comment-report-already-${commentId}`}
          className='flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100'
        >
          <AlertTriangle className='mt-0.5 shrink-0' size={16} aria-hidden />
          <span>
            You&apos;ve already reported this comment. A moderator will
            review it shortly.
          </span>
        </div>
      )}

      {error && submitCopy && (
        <div
          role='alert'
          data-testid={`comment-report-error-${commentId}`}
          className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'
        >
          <AlertTriangle className='mt-0.5 shrink-0' size={16} aria-hidden />
          <div>
            <p className='font-medium'>{submitCopy.title}</p>
            <p>{submitCopy.body}</p>
          </div>
        </div>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel
          data-testid={`comment-report-cancel-${commentId}`}
          disabled={isLoading}
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction asChild>
          <Button
            type='button'
            disabled={submitDisabled}
            aria-busy={isLoading || undefined}
            onClick={handleSubmit}
            data-testid={`comment-report-submit-${commentId}`}
          >
            <Send className='mr-2' size={16} aria-hidden />
            Submit Report
          </Button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

// Re-export the reason type for consumers that want a typed reason
// enumeration (e.g. for a moderation analytics report).
export type { ReportReason };