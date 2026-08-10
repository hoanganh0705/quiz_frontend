'use client';

/**
 * `CommentReportActionConfirmDialog` — confirm dialog that wraps
 * `useResolveCommentReport` in `AuditActionShell`.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D2.
 *
 * ## What this component renders
 *
 * The dialog selected from `CommentReportActionMenu` (D1). It shows
 * the offending-comment summary, the report reason, and (for
 * irreversible actions that require typed-confirm) a typed-confirm
 * input. On confirm, the dialog invokes the resolve hook and
 * surfaces:
 *
 *   - **`COMMENT_REPORT_NOT_FOUND`** → stable "report no longer exists" copy.
 *   - **`COMMENT_REPORT_ALREADY_RESOLVED`** → stable "already handled" copy.
 *   - **`GLOBAL_FORBIDDEN`** → stable "permission denied" notice.
 *   - any other error → `RequestIdBanner` for Sentry correlation.
 *
 * The dialog never retries the mutation itself; the parent row
 * observes `onClose()` and decides whether to reopen the menu.
 *
 * ## Why no typed-confirm input?
 *
 * Every documented comment-side action in `COMMENT_REPORT_ACTIONS`
 * is reversible (the `hide_comment` action is reversible via
 * `restoreComment`). The catalogue therefore never sets
 * `requiresTypedConfirm: true` and `confirmString` is always `null`.
 * The dialog omits the typed-confirm input branch entirely —
 * reversible actions do not need the friction. If a future
 * irreversible action is added, the dialog will surface the
 * typed-confirm input automatically through the
 * `metadata.requiresTypedConfirm` branch.
 *
 * ## Disabled-when-null pattern
 *
 * When `report` is `null` or `action` is `null` the dialog renders
 * `null` — the parent row controls mount/unmount. The `action`
 * prop must align with the report (the menu never offers an action
 * without a corresponding row).
 *
 * ## Cross-batch invariants
 *
 * - The dialog never calls services directly. The resolve hook
 *   (TKT-7.6.C2) is the only mutation surface.
 * - `RequestIdBanner` renders only on failure, only when
 *   `error.requestId` is non-empty.
 * - The audit `before` snapshot is always a redacted copy of
 *   `report` (reporter id, free-text details, and any embedded
 *   comment snapshot are excluded from the breadcrumb payload via
 *   `redactFields`).
 * - The dialog closes on success and on cancellation; it does not
 *   close on failure (so the admin can read the request id).
 */

import { useCallback, useMemo, useState } from 'react';

import {
  AlertDialog,
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

import { useResolveCommentReport } from '../hooks/useResolveCommentReport';
import {
  COMMENT_REPORT_ACTIONS,
  type CommentReportConsumerAction,
} from '../action-enum';
import type { CommentReportDto } from '../admin-comment-report-types';
import type { ApiError } from '@/lib/api/core/ApiError';

// ─── Component props ────────────────────────────────────────────────────────

export interface CommentReportActionConfirmDialogProps {
  /** Whether the dialog is open. `false` short-circuits the render. */
  open: boolean;
  /**
   * The report row the action targets. `null` means the dialog is
   * inactive (parent row renders nothing).
   */
  report: CommentReportDto | null;
  /**
   * The action the admin selected. The dialog selects reversible
   * vs. irreversible surface based on `COMMENT_REPORT_ACTIONS[action]`.
   */
  action: CommentReportConsumerAction | null;
  /** Called when the dialog should close (success or cancel). */
  onClose: () => void;
}

// ─── Outcome subcomponent ───────────────────────────────────────────────────

interface OutcomeNoticeProps {
  outcome: 'forbidden' | 'not-found' | 'already-resolved' | 'reverted' | 'success' | null;
  error: ApiError | null;
  reportId: string;
}

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
      'Another admin already resolved this report, or the comment was deleted. The queue has been refreshed.';
  } else if (outcome === 'already-resolved') {
    title = 'Report already handled';
    description =
      'Another admin already resolved this report. The queue has been refreshed.';
  } else {
    title = 'Could not save the action';
    description =
      'The resolve request failed. The status was not changed. Copy the request id and retry.';
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
      data-testid={`comment-report-confirm-outcome-${reportId}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{description}</p>
      <RequestIdBanner error={error} />
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommentReportActionConfirmDialog({
  open,
  report,
  action,
  onClose,
}: CommentReportActionConfirmDialogProps): React.ReactElement | null {
  const {
    resolve,
    isPending,
    error,
    lastOutcome,
  } = useResolveCommentReport();

  const isActive = open && report !== null && action !== null;
  const metadata = action !== null ? COMMENT_REPORT_ACTIONS[action] : null;

  /**
   * Local typed-confirm input. The catalogue ships without
   * irreversible actions, so the input is dead code in the current
   * scope; the state is retained for shape parity with Epic 7.5's
   * `ReviewReportActionConfirmDialog` and so the future
   * irreversible-action branch picks it up without re-mounting.
   */
  const [typedInput, setTypedInput] = useState('');
  const matchesTypedConfirm =
    metadata === null || !metadata.requiresTypedConfirm
      ? true
      : metadata.confirmString !== null &&
        typedInput === metadata.confirmString;

  const beforeSnapshot = useMemo(() => {
    if (report === null) return null;
    return {
      reportId: report.reportId,
      commentId: report.commentId,
      reason: report.reason,
      status: report.status,
    };
  }, [report]);

  const mutate = useCallback(async () => {
    if (report === null || action === null) {
      throw new Error('Cannot resolve without a report and an action.');
    }
    return resolve(report.reportId, action);
  }, [report, action, resolve]);

  const handleShellComplete = useCallback(
    (result: unknown) => {
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

  const outcomeKind = (lastOutcome?.kind ?? null) as
    | 'forbidden'
    | 'not-found'
    | 'already-resolved'
    | 'reverted'
    | 'success'
    | null;
  const outcomeError = lastOutcome?.cause ?? error ?? null;

  const hasFailure =
    outcomeKind === 'forbidden' ||
    outcomeKind === 'not-found' ||
    outcomeKind === 'already-resolved' ||
    outcomeKind === 'reverted';
  const confirmDisabled = isPending || !matchesTypedConfirm;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={`comment-report-confirm-dialog-${report.reportId}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{metadata.label}</AlertDialogTitle>
          <AlertDialogDescription>
            {metadata.requiresCompanionHide
              ? 'This will hide the reported comment and mark the report as resolved. The comment can be restored later.'
              : `This will change the report's status to ${metadata.sdkStatus}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
          data-testid={`comment-report-confirm-summary-${report.reportId}`}
        >
          <p className="font-semibold">Offending comment</p>
          <p className="mt-1">
            Comment id:{' '}
            <span className="font-mono">{report.commentId}</span>
          </p>
          <p className="mt-2 text-slate-700">
            Reason: <span className="font-medium">{report.reason}</span>
          </p>
        </div>

        {metadata.requiresTypedConfirm && metadata.confirmString !== null ? (
          <div
            className="space-y-2"
            data-testid={`comment-report-confirm-typed-${report.reportId}`}
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
              data-testid={`comment-report-confirm-typed-input-${report.reportId}`}
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
                onClick={() => {
                  // `mutate()` rejects on the typed-code branches;
                  // the hook surfaces the failure via `lastOutcome`
                  // and renders the friendly notice. We swallow the
                  // rejection here so the click handler does not
                  // produce an unhandled-promise-rejection — the
                  // breadcrumb + outcome state is the source of
                  // truth. The `void` discards the returned Promise.
                  mutate().catch(() => undefined);
                }}
                data-testid={`comment-report-confirm-action-${report.reportId}`}
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
