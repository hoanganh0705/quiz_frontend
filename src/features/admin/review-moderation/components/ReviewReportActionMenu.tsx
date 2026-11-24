"use client";

import { memo, useCallback } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { usePermission } from "@/features/admin/hooks/usePermission";
import { PermissionDeniedNotice } from "@/features/admin/components/PermissionDeniedNotice";
import { PERMISSIONS } from "@/features/admin/permissions";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import {
  REPORT_ACTIONS,
  REPORT_CONSUMER_ACTIONS,
  type ReportConsumerAction,
} from "@/features/admin/review-moderation/action-enum";
import { isSelfModerationAttempt } from "@/features/admin/review-moderation/report-id-validation";
import type { AdminReportDto } from "@/features/admin/review-moderation/admin-report-types";
import { cn } from "@/shared/utils/merge-class-names";

export interface ReviewReportActionMenuProps {
  report: AdminReportDto;

  onAction: (action: ReportConsumerAction) => void;

  className?: string;
}

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

  if (permission.isLoading) {
    return (
      <button
        type="button"
        className={cn(
          "flex size-9 cursor-progress items-center justify-center rounded-lg border border-border/50 text-muted-foreground",
          className,
        )}
        aria-label="Loading actions"
        data-testid={`review-report-action-trigger-${report.reportId}`}
        disabled
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
    );
  }

  if (!permission.hasPermission) {
    return (
      <div data-testid={`review-report-permission-denied-${report.reportId}`}>
        <PermissionDeniedNotice variant="control" />
      </div>
    );
  }

  if (isSelfAttempt) {
    return (
      <div
        role="note"
        className="rounded-md border border-warning/35 bg-warning/10 px-3 py-1.5 text-xs text-warning dark:bg-warning/20"
        data-testid={`review-report-self-moderation-notice-${report.reportId}`}
      >
        You can&apos;t moderate your own review.
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background",
            "text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-input",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          aria-label="Report actions"
          data-testid={`review-report-action-trigger-${report.reportId}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
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

          const previousAction =
            index > 0 ? REPORT_CONSUMER_ACTIONS[index - 1] : null;
          const showSeparator =
            previousAction !== null &&
            REPORT_ACTIONS[previousAction].irreversible !== isIrreversible;

          return (
            <div key={action}>
              {showSeparator ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onClick={handleSelect(action)}
                data-testid={`review-report-action-${action}-${report.reportId}`}
                className={isIrreversible ? "text-destructive focus:text-destructive focus:bg-destructive/10" : undefined}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{metadata.label}</span>
                  {isIrreversible ? (
                    <span className="text-xs text-destructive/80">
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
