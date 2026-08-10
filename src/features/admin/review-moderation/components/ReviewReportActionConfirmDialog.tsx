'use client';

/**
 * `ReviewReportActionConfirmDialog` — confirm dialog that wraps
 * `useResolveReviewReport` in `AuditActionShell` and gates
 * irreversible actions behind a typed-confirm step.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D2.
 *
 * ## What this component renders
 *
 * The dialog selected from `ReviewReportActionMenu` (D1). It shows
 * the offending-review summary, the report reason, and (for
 * irreversible actions) a typed-confirm input that requires the
 * admin to type the documented confirm string. On confirm, the
 * dialog invokes the resolve hook and surfaces:
 *
 *   - **`REVIEW_NOT_FOUND`** → stable "report no longer exists" copy.
 *   - **`GLOBAL_FORBIDDEN`** → stable "permission denied" notice.
 *   - any other error → `RequestIdBanner` for Sentry correlation.
 *
 * The dialog never retries the mutation itself; the parent row
 * observes `onClose()` and decides whether to reopen the menu.
 *
 * ## Confirm-dialog selection
 *
 * The dialog always renders an `AlertDialog` body — reversible
 * and irreversible paths share the same surface so the offending-
 * review summary, the reason, and the typed-confirm input render
 * in the same dialog. The irreversible path adds:
 *
 *   1. a `<Input>` bound to local state (`typedInput`).
 *   2. an `expectedConfirmString` derived from the action's
 *      `metadata.confirmString` (TKT-7.5.B2 ↔ TKT-7.1.A5).
 *   3. a `disabled` guard on the confirm button — disabled until
 *      the typed value matches `expectedConfirmString` byte-for-byte.
 *
 * ## Disabled-when-null pattern
 *
 * When `report` is `null` the dialog renders `null` — the parent
 * row controls mount/unmount. The `action` prop must align with
 * the report (the menu never offers an action without a
 * corresponding row).
 *
 * ## Cross-batch invariants
 *
 * - The dialog never calls services directly. The resolve hook
 *   (TKT-7.5.C2) is the only mutation surface.
 * - `RequestIdBanner` renders only on failure, only when
 *   `error.requestId` is non-empty.
 * - The audit `before` snapshot is always a redacted copy of
 *   `report` (reporter id and any free-text details are excluded
 *   from the breadcrumb payload via `redactFields`).
 * - The dialog closes on success and on cancellation; it does not
 *   close on failure (so the admin can read the request id).
 */

import { useCallback, useMemo, useState } from 'react';

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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { AuditActionShell } from '@/features/admin/components/AuditActionShell';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useResolveReviewReport } from '@/features/admin/review-moderation/hooks/useResolveReviewReport';
import {
  REPORT_ACTIONS,
  type ReportConsumerAction,
} from '@/features/admin/review-moderation/action-enum';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';
import type { ApiError } from '@/lib/api/core/ApiError';

// ─── Component props ────────────────────────────────────────────────────────

export interface ReviewReportActionConfirmDialogProps {
  /** Whether the dialog is open. `false` short-circuits the render. */
  open: boolean;
  /**
   * The report row the action targets. `null` means the dialog is
   * inactive (parent row renders nothing).
   */
  report: AdminReportDto | null;
  /**
   * The action the admin selected. The dialog selects reversible
   * vs. irreversible surface based on `REPORT_ACTIONS[action]`.
   */
  action: ReportConsumerAction | null;
  /** Called when the dialog should close (success or cancel). */
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewReportActionConfirmDialog({
  open,
  report,
  action,
  onClose,
}: ReviewReportActionConfirmDialogProps): React.ReactElement | null {
  const {
    resolve,
    isPending,
    error,
    lastOutcome,
  } = useResolveReviewReport();

  // Defensive: when the dialog is closed or no report/action is
  // selected, render nothing. The hook above is always invoked so
  // its `reset()` semantics line up across mounts.
  const isActive = open && report !== null && action !== null;

  const metadata = action !== null ? REPORT_ACTIONS[action] : null;

  /**
   * Local typed-confirm input. Empty string by default; the
   * confirm button is disabled until the value matches
   * `metadata.confirmString` byte-for-byte (irreversible actions
   * only).
   */
  const [typedInput, setTypedInput] = useState('');
  const matchesTypedConfirm =
    metadata === null || !metadata.requiresTypedConfirm
      ? true
      : metadata.confirmString !== null &&
        typedInput === metadata.confirmString;

  /**
   * Build the audit `before` snapshot. The shell redacts
   * `reporterId` and `details` (free-text moderation notes) so the
   * breadcrumb payload never carries those fields.
   */
  const beforeSnapshot = useMemo(() => {
    if (report === null) return null;
    return {
      reportId: report.reportId,
      reviewId: report.reviewId,
      reportedUserId: report.reportedUserId,
      reason: report.reason,
      status: report.status,
      rating: report.rating,
    };
  }, [report]);

  /**
   * Mutate for the audit shell. Wraps the resolve hook so the
   * shell's breadcrumb state and the hook's own breadcrumb state
   * are emitted side-by-side.
   */
  const mutate = useCallback(async () => {
    if (report === null || action === null) {
      throw new Error('Cannot resolve without a report and an action.');
    }
    return resolve(report.reportId, action);
  }, [report, action, resolve]);

  const handleShellComplete = useCallback(
    (result: unknown) => {
      // The shell resolves with the mutate() return value. The hook
      // resolves with the patched `AdminReportDto` on success.
      if (result !== undefined && result !== null) {
        onClose();
      }
    },
    [onClose],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onClose();
    },
    [onClose],
  );

  if (!isActive || report === null || action === null || metadata === null) {
    return null;
  }

  // ─── Outcome branches ───────────────────────────────────────────────
  const outcomeKind = lastOutcome?.kind ?? null;
  const outcomeError = lastOutcome?.cause ?? error ?? null;

  const isForbidden = outcomeKind === 'forbidden';
  const isNotFound = outcomeKind === 'not-found';
  const isReverted = outcomeKind === 'reverted';
  const hasFailure = isForbidden || isNotFound || isReverted;
  const confirmDisabled =
    isPending || !matchesTypedConfirm;

  // Title and body are shared across reversible and irreversible
  // branches so the typed-confirm input renders in the same
  // dialog as the summary.
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={`review-report-confirm-dialog-${report.reportId}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{metadata.label}</AlertDialogTitle>
          <AlertDialogDescription>
            {metadata.irreversible
              ? 'This is a destructive action and cannot be undone.'
              : `This will change the report's status to ${metadata.sdkStatus}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
          data-testid={`review-report-confirm-summary-${report.reportId}`}
        >
          <p className="font-semibold">Offending review</p>
          <p className="mt-1">
            <span className="font-medium">{report.quizTitle}</span> — rated{' '}
            {report.rating}/5 by{' '}
            <span className="font-medium">{report.reviewerUsername}</span>.
          </p>
          {report.comment !== null && report.comment !== undefined ? (
            <p className="mt-1 italic">&ldquo;{report.comment}&rdquo;</p>
          ) : null}
          <p className="mt-2 text-slate-700">
            Reason: <span className="font-medium">{report.reason}</span>
          </p>
        </div>

        {metadata.requiresTypedConfirm && metadata.confirmString !== null ? (
          <div
            className="space-y-2"
            data-testid={`review-report-confirm-typed-${report.reportId}`}
          >
            <Label htmlFor={`typed-confirm-${report.reportId}`}>
              Type <span className="font-mono">{metadata.confirmString}</span> to
              confirm
            </Label>
            <Input
              id={`typed-confirm-${report.reportId}`}
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              placeholder={metadata.confirmString}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-testid={`review-report-confirm-typed-input-${report.reportId}`}
            />
          </div>
        ) : null}

        {hasFailure && outcomeError !== null ? (
          <OutcomeNotice
            outcome={outcomeKind}
            error={outcomeError}
            reportId={report.reportId}
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AuditActionShell
            action={metadata.breadcrumbAction}
            before={beforeSnapshot}
            redactFields={['reporterId', 'details']}
            mutate={mutate}
            onBreadcrumb={handleShellComplete}
          >
            {(shell) => (
              <Button
                type="button"
                disabled={confirmDisabled || shell.isPending}
                onClick={async () => {
                  await mutate();
                }}
                data-testid={`review-report-confirm-action-${report.reportId}`}
              >
                {isPending || shell.isPending ? 'Working…' : metadata.label}
              </Button>
            )}
          </AuditActionShell>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Outcome subcomponent ───────────────────────────────────────────────────

interface OutcomeNoticeProps {
  outcome: 'forbidden' | 'not-found' | 'reverted' | 'success' | null;
  error: import('@/lib/api/core/ApiError').ApiError | null;
  reportId: string;
}

/**
 * Inline notice shown inside the dialog on a failed resolve. The
 * notice never blocks dismissal; admins can copy the request id
 * (when present) and close the dialog manually.
 */
function OutcomeNotice({
  outcome,
  error,
  reportId,
}: OutcomeNoticeProps): React.ReactElement | null {
  if (outcome === null || outcome === 'success') return null;

  let title: string;
  let description: string;
  if (outcome === 'forbidden') {
    title = 'Permission denied';
    description =
      'Your account no longer has permission to perform this action. The status was not changed.';
  } else if (outcome === 'not-found') {
    title = 'Report no longer exists';
    description =
      'Another admin already resolved this report, or the review was deleted. The queue has been refreshed.';
  } else {
    title = 'Could not save the action';
    description =
      'The resolve request failed. The status was not changed. Copy the request id and retry.';
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
      data-testid={`review-report-confirm-outcome-${reportId}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{description}</p>
      <RequestIdBanner error={error} />
    </div>
  );
}
