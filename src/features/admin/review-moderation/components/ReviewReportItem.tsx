"use client";

import { memo, useCallback, useMemo } from "react";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  AdminReportDto,
  ReportState,
} from "@/features/admin/review-moderation/admin-report-types";
import { ReviewReportActionMenu } from "@/features/admin/review-moderation/components/ReviewReportActionMenu";
import type { ReportConsumerAction } from "@/features/admin/review-moderation/action-enum";

export type ReportRowStatus = "pending" | "resolved";

const STATUS_PILL_VIEW: Readonly<
  Record<
    ReportState,
    { label: string; pill: ReportRowStatus; tone: "warning" | "success" }
  >
> = Object.freeze({
  open: { label: "Pending", pill: "pending", tone: "warning" },
  reviewed: { label: "Reviewed", pill: "resolved", tone: "success" },
  dismissed: { label: "Dismissed", pill: "resolved", tone: "success" },
  actioned: { label: "Actioned", pill: "resolved", tone: "success" },
});

function formatRowTimestamp(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export interface ReviewReportItemProps {
  report: AdminReportDto;

  onSelect: (report: AdminReportDto) => void;

  onAction: (action: ReportConsumerAction, report: AdminReportDto) => void;

  selected?: boolean;

  className?: string;
}

export const ReviewReportItem = memo(function ReviewReportItem({
  report,
  onSelect,
  onAction,
  selected = false,
  className,
}: ReviewReportItemProps): React.ReactElement {
  const statusView = useMemo(
    () => STATUS_PILL_VIEW[report.status],
    [report.status],
  );

  const timestampValue = useMemo(() => {
    return statusView.pill === "resolved" ? report.updatedAt : report.createdAt;
  }, [statusView.pill, report.updatedAt, report.createdAt]);

  const timestampLabel = useMemo(() => {
    const formatted = formatRowTimestamp(timestampValue);
    return formatted.length === 0 ? "" : formatted;
  }, [timestampValue]);

  const handleRowClick = useCallback(() => {
    onSelect(report);
  }, [report, onSelect]);

  const handleAction = useCallback(
    (action: ReportConsumerAction) => {
      onAction(action, report);
    },
    [report, onAction],
  );

  const stopPropagation = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation();
    },
    [],
  );

  return (
    <div
      role="listitem"
      data-testid={`review-report-row-${report.reportId}`}
      data-state={report.status}
      className={cn(
        "group relative flex w-full items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/25 shadow-sm"
          : "border-border hover:border-input hover:bg-muted/40",
        className ?? "",
      )}
    >
      {/* Accessible card selection trigger */}
      <button
        type="button"
        onClick={handleRowClick}
        aria-label={`View report for ${report.quizTitle} by ${report.reviewerUsername}`}
        aria-pressed={selected}
        className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {/* Main information block */}
      <div className="relative z-10 flex flex-1 flex-col gap-1.5 overflow-hidden pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className="truncate font-semibold text-foreground text-sm"
            data-testid={`review-report-row-reporter-${report.reportId}`}
          >
            {report.reviewerUsername}
          </span>
          <span className="text-xs text-muted-foreground">reported on</span>
          <span
            className="truncate text-xs font-medium text-foreground/90 max-w-[200px] sm:max-w-[280px]"
            data-testid={`review-report-row-quiz-${report.reportId}`}
          >
            {report.quizTitle}
          </span>
        </div>

        <div
          className="flex items-center gap-2.5 text-xs text-muted-foreground"
          data-testid={`review-report-row-rating-${report.reportId}`}
        >
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden="true"
                className={cn(
                  "size-3.5",
                  index < report.rating
                    ? "fill-warning text-warning"
                    : "fill-transparent text-muted-foreground/30",
                )}
              />
            ))}
          </span>
          <span className="font-mono">{report.rating}/5</span>
          <span aria-hidden="true">·</span>
          <span
            className="capitalize font-medium text-foreground"
            data-testid={`review-report-row-reason-${report.reportId}`}
          >
            {report.reason.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Meta + Action block */}
      <div className="relative z-10 flex items-center gap-3 shrink-0">
        {/* Status pill */}
        <Badge
          variant="outline"
          data-testid={`review-report-row-pill-${report.reportId}`}
          data-pill={statusView.pill}
          className={cn(
            "shrink-0 capitalize font-medium text-xs px-2.5 py-0.5",
            statusView.tone === "warning"
              ? "border-warning/35 bg-warning/10 text-warning dark:bg-warning/20"
              : "border-success/35 bg-success/10 text-success dark:bg-success/20",
          )}
        >
          {statusView.label}
        </Badge>

        {/* Timestamp */}
        <span
          className="hidden shrink-0 text-xs text-muted-foreground xl:inline font-mono"
          data-testid={`review-report-row-timestamp-${report.reportId}`}
        >
          {timestampLabel}
        </span>

        {/* Action menu (click-isolated) */}
        <div
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
          data-testid={`review-report-row-actions-${report.reportId}`}
        >
          <ReviewReportActionMenu report={report} onAction={handleAction} />
        </div>
      </div>
    </div>
  );
});
