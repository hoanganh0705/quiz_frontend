'use client';

/**
 * `HideCommentDialog` / `RestoreCommentDialog` — confirm dialogs for
 * the documentation-flip side effects on a comment.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D3.
 *
 * ## What these components render
 *
 * Two single-purpose dialogs that wrap `useHideComment` (C3) and
 * `useRestoreComment` (C3) in the documented
 * `AuditActionShell` pattern. The dialog renders:
 *
 *   - the offending comment summary (id, optional thread id);
 *   - the breadcrumb-protected confirm button (driven by the
 *     matching hook's `isPending` flag);
 *   - the typed-confirm input only when the action catalogue
 *     requires it (the current catalogue ships with no
 *     irreversible comment-side actions, so the input is dead
 *     code today).
 *
 * ## Outcome branches
 *
 * Each dialog surfaces the documented typed-code copy:
 *
 *   - **`COMMENT_ALREADY_HIDDEN`** → "comment is already hidden".
 *   - **`COMMENT_NOT_HIDDEN`** → "comment is not hidden; no restore needed".
 *   - **`COMMENT_NOT_FOUND`** → "comment no longer exists".
 *   - **`GLOBAL_FORBIDDEN`** → "permission denied".
 *   - any other error → `RequestIdBanner` for Sentry correlation.
 *
 * The dialog closes on success; on failure it stays open so the
 * admin can read the typed copy and the request id.
 *
 * ## Cross-batch invariants
 *
 * - The dialog never calls services directly. The hide / restore
 *   hooks (TKT-7.6.C3) are the only mutation surface.
 * - `RequestIdBanner` renders only on failure, only when
 *   `error.requestId` is non-empty.
 * - The audit `before` snapshot is the comment id only — the
 *   free-text comment body is not retained in the breadcrumb
 *   payload (the comment moderation policy excludes bodies from
 *   audit trails).
 * - The dialog closes on success and on cancellation; it does not
 *   close on failure.
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

import {
  useHideComment,
  useRestoreComment,
} from '../hooks/useHideComment';
import { COMMENT_REPORT_ACTIONS } from '../action-enum';
import type { ApiError } from '@/lib/api/core/ApiError';

// Restore-comment is a side-channel action outside the
// `COMMENT_REPORT_ACTIONS` consumer catalogue (the catalogue only
// covers report-side actions like `dismiss` / `hide_comment`).
// The dialog needs a metadata record with the same shape so the
// `AuditActionShell` breadcrumb + the typed-confirm branch share
// one wiring. The local constant mirrors the `COMMENT_REPORT_ACTIONS`
// shape exactly; the linked breadcrumb action is documented in
// `EPIC_7_6_TICKETS.md` §TKT-7.6.C3.
const RESTORE_COMMENT_METADATA = {
  breadcrumbAction: 'b.admin.comment_moderation.restore',
  requiresTypedConfirm: false,
  confirmString: null as string | null,
};

// ─── Outcome subcomponent ───────────────────────────────────────────────────

type OutcomeKind =
  | 'forbidden'
  | 'not-found'
  | 'already-hidden'
  | 'not-hidden'
  | 'reverted'
  | 'success'
  | null;

interface OutcomeNoticeProps {
  outcome: OutcomeKind;
  error: ApiError | null;
  commentId: string;
  variant: 'hide' | 'restore';
}

function hideCopyForOutcome(
  outcome: OutcomeKind,
): { title: string; description: string } | null {
  if (outcome === null || outcome === 'success') return null;
  switch (outcome) {
    case 'forbidden':
      return {
        title: 'Permission denied',
        description:
          'Your account no longer has permission to hide this comment. No change was made.',
      };
    case 'not-found':
      return {
        title: 'Comment no longer exists',
        description:
          'The comment was deleted before the action could be applied. The queue has been refreshed.',
      };
    case 'already-hidden':
      return {
        title: 'Comment is already hidden',
        description:
          'No change was made. The dialog will close on the next refresh.',
      };
    case 'reverted':
      return {
        title: 'Could not hide the comment',
        description:
          'The hide request failed. No change was made. Copy the request id and retry.',
      };
    default:
      return null;
  }
}

function restoreCopyForOutcome(
  outcome: OutcomeKind,
): { title: string; description: string } | null {
  if (outcome === null || outcome === 'success') return null;
  switch (outcome) {
    case 'forbidden':
      return {
        title: 'Permission denied',
        description:
          'Your account no longer has permission to restore this comment. No change was made.',
      };
    case 'not-found':
      return {
        title: 'Comment no longer exists',
        description:
          'The comment was deleted before the action could be applied. The queue has been refreshed.',
      };
    case 'not-hidden':
      return {
        title: 'Comment is not hidden',
        description:
          'No change was made. The dialog will close on the next refresh.',
      };
    case 'reverted':
      return {
        title: 'Could not restore the comment',
        description:
          'The restore request failed. No change was made. Copy the request id and retry.',
      };
    default:
      return null;
  }
}

function OutcomeNotice({
  outcome,
  error,
  commentId,
  variant,
}: OutcomeNoticeProps): React.ReactElement | null {
  const copy =
    variant === 'hide'
      ? hideCopyForOutcome(outcome)
      : restoreCopyForOutcome(outcome);
  if (copy === null) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
      data-testid={
        variant === 'hide'
          ? `comment-hide-confirm-outcome-${commentId}`
          : `comment-restore-confirm-outcome-${commentId}`
      }
    >
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1">{copy.description}</p>
      <RequestIdBanner error={error} />
    </div>
  );
}

// ─── HideCommentDialog ──────────────────────────────────────────────────────

export interface HideCommentDialogProps {
  /** Whether the dialog is open. `false` short-circuits the render. */
  open: boolean;
  /** The comment id to hide. `null` means the dialog is inactive. */
  commentId: string | null;
  /** Optional thread id for the offending comment summary. */
  threadId?: string | null;
  /** Called when the dialog should close (success or cancel). */
  onClose: () => void;
}

export function HideCommentDialog({
  open,
  commentId,
  threadId = null,
  onClose,
}: HideCommentDialogProps): React.ReactElement | null {
  const { hide, isPending, error, lastOutcome } = useHideComment();
  const metadata = COMMENT_REPORT_ACTIONS.hide_comment;

  const isActive = open && commentId !== null;

  // The current catalogue ships with no typed-confirm requirement
  // for hide_comment. The state is retained so a future
  // irreversible variant lights up without re-mounting the shell.
  const [typedInput, setTypedInput] = useState('');
  const matchesTypedConfirm =
    metadata === null || !metadata.requiresTypedConfirm
      ? true
      : metadata.confirmString !== null &&
        typedInput === metadata.confirmString;

  const beforeSnapshot = useMemo(() => {
    if (commentId === null) return null;
    return {
      commentId,
      threadId,
    };
  }, [commentId, threadId]);

  const mutate = useCallback(async () => {
    if (commentId === null) {
      throw new Error('Cannot hide without a comment id.');
    }
    return hide(commentId);
  }, [commentId, hide]);

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

  if (!isActive || commentId === null) {
    return null;
  }

  const outcomeKind = lastOutcome?.kind ?? null;
  const hasFailure =
    outcomeKind === 'forbidden' ||
    outcomeKind === 'not-found' ||
    outcomeKind === 'already-hidden' ||
    outcomeKind === 'reverted';
  const confirmDisabled = isPending || !matchesTypedConfirm;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid={`comment-hide-confirm-dialog-${commentId}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>Hide comment</AlertDialogTitle>
          <AlertDialogDescription>
            The comment will be removed from public view. You can restore the
            comment at any time from the comment moderation queue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
          data-testid={`comment-hide-confirm-summary-${commentId}`}
        >
          <p className="font-semibold">Offending comment</p>
          <p className="mt-1">
            Comment id: <span className="font-mono">{commentId}</span>
          </p>
          {threadId !== null ? (
            <p className="mt-1">
              Thread: <span className="font-mono">{threadId}</span>
            </p>
          ) : null}
        </div>

        {metadata.requiresTypedConfirm && metadata.confirmString !== null ? (
          <div
            className="space-y-2"
            data-testid={`comment-hide-confirm-typed-${commentId}`}
          >
            <Label htmlFor={`comment-hide-typed-confirm-${commentId}`}>
              Type <span className="font-mono">{metadata.confirmString}</span> to
              confirm
            </Label>
            <Input
              id={`comment-hide-typed-confirm-${commentId}`}
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              placeholder={metadata.confirmString}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-testid={`comment-hide-confirm-typed-input-${commentId}`}
            />
          </div>
        ) : null}

        {hasFailure ? (
          <OutcomeNotice
            outcome={outcomeKind}
            error={error}
            commentId={commentId}
            variant="hide"
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AuditActionShell
            action={metadata.breadcrumbAction}
            before={beforeSnapshot}
            redactFields={['commentBody', 'threadBody']}
            mutate={mutate}
            onBreadcrumb={handleShellComplete}
          >
            {(shell) => (
              <Button
                type="button"
                disabled={confirmDisabled || shell.isPending}
                onClick={() => {
                  // See `CommentReportActionConfirmDialog` — the
                  // hook surfaces failures via `lastOutcome`; we
                  // swallow the rejection here so the click handler
                  // does not produce an unhandled-promise-rejection.
                  mutate().catch(() => undefined);
                }}
                data-testid={`comment-hide-confirm-action-${commentId}`}
              >
                {isPending || shell.isPending ? 'Working…' : 'Hide comment'}
              </Button>
            )}
          </AuditActionShell>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── RestoreCommentDialog ───────────────────────────────────────────────────

export interface RestoreCommentDialogProps {
  /** Whether the dialog is open. `false` short-circuits the render. */
  open: boolean;
  /** The comment id to restore. `null` means the dialog is inactive. */
  commentId: string | null;
  /** Optional thread id for the offending comment summary. */
  threadId?: string | null;
  /** Called when the dialog should close (success or cancel). */
  onClose: () => void;
}

export function RestoreCommentDialog({
  open,
  commentId,
  threadId = null,
  onClose,
}: RestoreCommentDialogProps): React.ReactElement | null {
  const { restore, isPending, error, lastOutcome } = useRestoreComment();
  const metadata = RESTORE_COMMENT_METADATA;

  const isActive = open && commentId !== null;

  const [typedInput, setTypedInput] = useState('');
  const matchesTypedConfirm =
    metadata === null || !metadata.requiresTypedConfirm
      ? true
      : metadata.confirmString !== null &&
        typedInput === metadata.confirmString;

  const beforeSnapshot = useMemo(() => {
    if (commentId === null) return null;
    return {
      commentId,
      threadId,
    };
  }, [commentId, threadId]);

  const mutate = useCallback(async () => {
    if (commentId === null) {
      throw new Error('Cannot restore without a comment id.');
    }
    return restore(commentId);
  }, [commentId, restore]);

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

  if (!isActive || commentId === null) {
    return null;
  }

  const outcomeKind = lastOutcome?.kind ?? null;
  const hasFailure =
    outcomeKind === 'forbidden' ||
    outcomeKind === 'not-found' ||
    outcomeKind === 'not-hidden' ||
    outcomeKind === 'reverted';
  const confirmDisabled = isPending || !matchesTypedConfirm;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        data-testid={`comment-restore-confirm-dialog-${commentId}`}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Restore comment</AlertDialogTitle>
          <AlertDialogDescription>
            The comment will be visible to the public again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
          data-testid={`comment-restore-confirm-summary-${commentId}`}
        >
          <p className="font-semibold">Offending comment</p>
          <p className="mt-1">
            Comment id: <span className="font-mono">{commentId}</span>
          </p>
          {threadId !== null ? (
            <p className="mt-1">
              Thread: <span className="font-mono">{threadId}</span>
            </p>
          ) : null}
        </div>

        {metadata.requiresTypedConfirm && metadata.confirmString !== null ? (
          <div
            className="space-y-2"
            data-testid={`comment-restore-confirm-typed-${commentId}`}
          >
            <Label htmlFor={`comment-restore-typed-confirm-${commentId}`}>
              Type <span className="font-mono">{metadata.confirmString}</span> to
              confirm
            </Label>
            <Input
              id={`comment-restore-typed-confirm-${commentId}`}
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              placeholder={metadata.confirmString}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-testid={`comment-restore-confirm-typed-input-${commentId}`}
            />
          </div>
        ) : null}

        {hasFailure ? (
          <OutcomeNotice
            outcome={outcomeKind}
            error={error}
            commentId={commentId}
            variant="restore"
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AuditActionShell
            action={metadata.breadcrumbAction}
            before={beforeSnapshot}
            redactFields={['commentBody', 'threadBody']}
            mutate={mutate}
            onBreadcrumb={handleShellComplete}
          >
            {(shell) => (
              <Button
                type="button"
                disabled={confirmDisabled || shell.isPending}
                onClick={() => {
                  // See `CommentReportActionConfirmDialog` — the
                  // hook surfaces failures via `lastOutcome`; we
                  // swallow the rejection here so the click handler
                  // does not produce an unhandled-promise-rejection.
                  mutate().catch(() => undefined);
                }}
                data-testid={`comment-restore-confirm-action-${commentId}`}
              >
                {isPending || shell.isPending ? 'Working…' : 'Restore comment'}
              </Button>
            )}
          </AuditActionShell>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
