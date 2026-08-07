'use client';

/**
 * `ReviewReportActionMenu` — the per-row action menu rendered from
 * `ReviewReportItem`.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D1.
 *
 * ## What this component renders
 *
 * A three-dot trigger that opens a dropdown of the documented
 * `ReportConsumerAction` set. Reversible actions render with the
 * metadata `label`; irreversible actions additionally render with
 * a small "this cannot be undone" hint. The menu never calls
 * services directly — every action is forwarded to the parent via
 * `onAction(action)`.
 *
 * ## Gates (in evaluation order)
 *
 * 1. **Permission gate** — `usePermission('review_report_update')`.
 *    When the current admin does not hold the permission, the menu
 *    renders `<PermissionDeniedNotice>` instead of an action list.
 *    Note: the ticket description names the permission
 *    `REVIEW_MODERATE` as a label-only shorthand; the real key
 *    in `PERMISSIONS` is `review_report_update`.
 * 2. **Self-moderation gate** — `isSelfModerationAttempt(
 *    report.reportedUserId, currentUser.userId)`. When the gate
 *    fires, the menu renders the documented "you cannot moderate
 *    your own report" notice and disables every action.
 *
 * The self-moderation check uses `report.reportedUserId` (the
 * DTO's review-author id). The embedded `reviewSnapshot` is
 * intentionally **not** consulted because `EPIC_7_5_A1.md`
 * records that the snapshot is unreliable in the current
 * backend contract.
 *
 * ## Disabled-but-loaded state
 *
 * `usePermission` reports `isLoading: true` while the role
 * document is bootstrapping. In that window the menu renders
 * neither the action list nor the permission-denied notice —
 * it renders nothing inside the dropdown content slot (the
 * trigger stays inert). This avoids briefly flashing the
 * "denied" copy during boot. The bootstrap gate is invisible to
 * the user; the menu simply shows a loading affordance via the
 * disabled trigger.
 *
 * ## Cross-batch invariants
 *
 * - The menu never calls services or fetches data. Every effect
 *   reads from props or selectors.
 * - The `onAction` callback is invoked with the
 *   `ReportConsumerAction` constant — never with a SDK
 *   `status` value. The mapping lives in
 *   `action-enum.ts` (TKT-7.5.B2).
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

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

import {
  REPORT_ACTIONS,
  REPORT_CONSUMER_ACTIONS,
  type ReportConsumerAction,
} from '@/features/admin/review-moderation/action-enum';
import { isSelfModerationAttempt } from '@/features/admin/review-moderation/report-id-validation';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';

// ─── Component props ────────────────────────────────────────────────────────

export interface ReviewReportActionMenuProps {
  /**
   * The report row whose actions to surface. The component reads
   * `report.reportedUserId` for the self-moderation gate and
   * `report.reportId` for stable test-ids.
   */
  report: AdminReportDto;
  /**
   * Called when an admin selects an action. The argument is the
   * typed `ReportConsumerAction`; the parent decides whether to
   * open the resolve dialog (D2) or short-circuit.
   */
  onAction: (action: ReportConsumerAction) => void;
  /**
   * Optional className forwarded to the trigger button. Useful for
   * the parent row to align the trigger inside a flex layout.
   */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * `<ReviewReportActionMenu />` — the only menu rendered from the
 * queue's row component. Pure presentational: services and
 * mutations live in the resolve hook (TKT-7.5.C2).
 */
export const ReviewReportActionMenu = memo(function ReviewReportActionMenu({
  report,
  onAction,
  className,
}: ReviewReportActionMenuProps): React.ReactElement {
  const permission = usePermission(PERMISSIONS.review_report_update);
  const { currentUser } = useAuthSession();

  const isSelfAttempt = isSelfModerationAttempt(
    report.reportedUserId,
    currentUser?.userId ?? null,
  );

  const handleSelect = useCallback(
    (action: ReportConsumerAction) => () => {
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
        data-testid={`review-report-action-trigger-${report.reportId}`}
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
        data-testid={`review-report-permission-denied-${report.reportId}`}
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
        data-testid={`review-report-self-moderation-notice-${report.reportId}`}
      >
        You can&apos;t moderate a report about a review you wrote.
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
          aria-label="Report actions"
          data-testid={`review-report-action-trigger-${report.reportId}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56"
        data-testid={`review-report-action-menu-${report.reportId}`}
      >
        {REPORT_CONSUMER_ACTIONS.map((action, index) => {
          const metadata = REPORT_ACTIONS[action];
          const isIrreversible = metadata.irreversible;
          // Visual divider between reversible and irreversible
          // actions keeps the destructive intent legible at a
          // glance. Reversible (non-destructive) actions render
          // first, then irreversible.
          const previousAction = index > 0 ? REPORT_CONSUMER_ACTIONS[index - 1] : null;
          const showSeparator =
            previousAction !== null &&
            REPORT_ACTIONS[previousAction].irreversible !== isIrreversible;

          return (
            <div key={action}>
              {showSeparator ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onClick={handleSelect(action)}
                data-testid={`review-report-action-${action}-${report.reportId}`}
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
