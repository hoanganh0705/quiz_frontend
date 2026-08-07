'use client';

/**
 * `CommentReportActionMenu` — the per-row action menu rendered
 * from the comment-moderation queue row.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D1.
 *
 * ## What this component renders
 *
 * A three-dot trigger that opens a dropdown of the documented
 * `CommentReportConsumerAction` set. Reversible actions render with
 * the metadata `label`. The menu never calls services directly —
 * every action is forwarded to the parent via `onAction(action)`.
 *
 * ## Gates (in evaluation order)
 *
 * 1. **Permission gate** — `usePermission('comment_report_update')`.
 *    When the current admin does not hold the permission, the menu
 *    renders `<PermissionDeniedNotice>` instead of an action list.
 *    The ticket description names the permission as `COMMENT_MODERATE`
 *    (a label-only shorthand); the real key in `PERMISSIONS` is
 *    `comment_report_update`.
 * 2. **Self-moderation gate** — `isCommentSelfModerationAttempt(
 *    commentAuthorId, currentUserId)`. When the gate fires, the
 *    menu renders the documented "you cannot moderate your own
 *    comment" notice and disables every action.
 *
 * The self-moderation check uses the **comment row's** `userId`
 * (author id), read via the Phase 4 `useComment` hook upstream in
 * the row component. The menu **does not** attempt to fetch the
 * comment itself — the row passes the resolved `commentAuthorId`
 * (or `null` when unknown) as a prop. Passing `null` is treated as
 * "unknown author" and the gate does NOT fire (the documented
 * conservative behaviour).
 *
 * ## Disabled-but-loaded state
 *
 * `usePermission` reports `isLoading: true` while the role
 * document is bootstrapping. In that window the menu renders a
 * `cursor-progress` trigger with no action list — the user sees
 * neither the trigger menu nor the permission-denied notice. This
 * avoids briefly flashing the "denied" copy during boot.
 *
 * ## Cross-batch invariants
 *
 * - The menu never calls services or fetches data. Every effect
 *   reads from props or selectors.
 * - The `onAction` callback is invoked with the
 *   `CommentReportConsumerAction` constant — never with a SDK
 *   `status` value. The mapping lives in `action-enum.ts`
 *   (TKT-7.6.B2).
 * - Reversible / irreversible distinction drives a hint label;
 *   it does **not** open the confirm dialog. Confirm-dialog
 *   selection is owned by the parent row (D2 consumer).
 */

import { memo, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

import { usePermission } from '@/features/admin/hooks/usePermission';
import { PermissionDeniedNotice } from '@/features/admin/components/PermissionDeniedNotice';
import { PERMISSIONS } from '@/features/admin/permissions';

import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';

import {
  COMMENT_REPORT_ACTIONS,
  COMMENT_REPORT_CONSUMER_ACTIONS,
  type CommentReportConsumerAction,
} from '../action-enum';
import { isCommentSelfModerationAttempt } from '../comment-id-validation';
import type { CommentReportDto } from '../admin-comment-report-types';

// ─── Component props ────────────────────────────────────────────────────────

export interface CommentReportActionMenuProps {
  /**
   * The report row whose actions to surface. The component reads
   * `report.reportId` for stable test-ids and `report.commentId`
   * for downstream wiring.
   */
  report: CommentReportDto;
  /**
   * The author id of the comment being moderated. The row
   * component is responsible for hydrating this value via the
   * Phase 4 `useComment` hook. `null` means "unknown" — the
   * self-moderation gate stays inert in that case.
   */
  commentAuthorId: string | null;
  /**
   * Called when an admin selects an action. The argument is the
   * typed `CommentReportConsumerAction`; the parent decides whether
   * to open the resolve dialog (D2) or short-circuit.
   */
  onAction: (action: CommentReportConsumerAction) => void;
  /**
   * Optional className forwarded to the trigger button. Useful for
   * the parent row to align the trigger inside a flex layout.
   */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * `<CommentReportActionMenu />` — the only menu rendered from the
 * queue's row component. Pure presentational: services and
 * mutations live in the resolve hook (TKT-7.6.C2).
 */
export const CommentReportActionMenu = memo(function CommentReportActionMenu({
  report,
  commentAuthorId,
  onAction,
  className,
}: CommentReportActionMenuProps): React.ReactElement {
  const permission = usePermission(PERMISSIONS.comment_report_update);
  const { currentUser } = useAuthBootstrap();

  const isSelfAttempt = isCommentSelfModerationAttempt(
    commentAuthorId,
    currentUser?.userId ?? null,
  );

  const handleSelect = useCallback(
    (action: CommentReportConsumerAction) => () => {
      onAction(action);
    },
    [onAction],
  );

  // ─── Loading state ──────────────────────────────────────────────────
  if (permission.isLoading) {
    return (
      <button
        type="button"
        className={[
          'flex h-8 w-8 cursor-progress items-center justify-center',
          'rounded-md text-muted-foreground',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Loading actions"
        data-testid={`comment-report-action-trigger-${report.reportId}`}
        disabled
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  // ─── Permission gate ───────────────────────────────────────────────
  if (!permission.hasPermission) {
    return (
      <div
        data-testid={`comment-report-permission-denied-${report.reportId}`}
      >
        <PermissionDeniedNotice variant="control" />
      </div>
    );
  }

  // ─── Self-moderation gate ──────────────────────────────────────────
  if (isSelfAttempt) {
    return (
      <div
        role="note"
        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        data-testid={`comment-report-self-moderation-notice-${report.reportId}`}
      >
        You can&apos;t moderate a report about a comment you wrote.
      </div>
    );
  }

  // ─── Default: full action menu ─────────────────────────────────────
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={[
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring focus-visible:ring-offset-2',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Comment report actions"
          data-testid={`comment-report-action-trigger-${report.reportId}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56"
        data-testid={`comment-report-action-menu-${report.reportId}`}
      >
        {COMMENT_REPORT_CONSUMER_ACTIONS.map((action, index) => {
          const metadata = COMMENT_REPORT_ACTIONS[action];
          const isIrreversible = !metadata.reversible;
          // Visual divider between reversible and irreversible
          // actions keeps the destructive intent legible at a
          // glance. Reversible (non-destructive) actions render
          // first, then irreversible.
          const previousAction = index > 0 ? COMMENT_REPORT_CONSUMER_ACTIONS[index - 1] : null;
          const showSeparator =
            previousAction !== null &&
            COMMENT_REPORT_ACTIONS[previousAction].reversible !==
              metadata.reversible;

          return (
            <div key={action}>
              {showSeparator ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onClick={handleSelect(action)}
                data-testid={`comment-report-action-${action}-${report.reportId}`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm">{metadata.label}</span>
                  {isIrreversible ? (
                    <span className="text-[11px] text-muted-foreground">
                      This cannot be undone.
                    </span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
