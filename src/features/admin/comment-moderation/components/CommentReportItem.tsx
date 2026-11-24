"use client";

import { memo, useCallback, useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  CommentReportDto,
  CommentReportState,
} from "@/features/admin/comment-moderation/admin-comment-report-types";
import { CommentReportActionMenu } from "@/features/admin/comment-moderation/components/CommentReportActionMenu";
import type { CommentReportConsumerAction } from "@/features/admin/comment-moderation/action-enum";

export type CommentRowStatus = "pending" | "resolved";

const STATUS_PILL_VIEW: Readonly<
  Record<
    CommentReportState,
    { label: string; pill: CommentRowStatus; tone: "slate" | "emerald" }
  >
> = Object.freeze({
  open: { label: "Pending", pill: "pending", tone: "slate" },
  reviewed: { label: "Reviewed", pill: "resolved", tone: "emerald" },
  dismissed: { label: "Dismissed", pill: "resolved", tone: "emerald" },
  actioned: { label: "Actioned", pill: "resolved", tone: "emerald" },
});

function formatRowTimestamp(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatReason(reason: string): string {
  if (!reason) return "Reported Comment";
  return reason
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatShortId(id: string): string {
  if (!id || id.length <= 8) return id;
  return `${id.slice(0, 8)}…`;
}

export interface CommentReportItemProps {
  report: CommentReportDto;

  commentAuthorId: string | null;

  onSelect: (report: CommentReportDto) => void;

  onAction: (
    action: CommentReportConsumerAction,
    report: CommentReportDto,
  ) => void;

  selected?: boolean;

  className?: string;
}

export const CommentReportItem = memo(function CommentReportItem({
  report,
  commentAuthorId,
  onSelect,
  onAction,
  selected = false,
  className,
}: CommentReportItemProps): React.ReactElement {
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

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(report);
      }
    },
    [report, onSelect],
  );

  const handleAction = useCallback(
    (action: CommentReportConsumerAction) => {
      onAction(action, report);
    },
    [report, onAction],
  );

  return (
    <div
      role="listitem"
      data-testid={`comment-report-row-${report.reportId}`}
      data-state={report.status}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-all duration-150 shadow-2xs",
        "hover:border-input hover:bg-muted/40",
        selected
          ? "border-primary/60 bg-primary/5 ring-1 ring-primary/25 shadow-xs"
          : "",
        className ?? "",
      )}
    >
      {/* Clickable content area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select report ${report.reportId}`}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        className="flex flex-1 flex-col gap-1.5 overflow-hidden cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-semibold text-foreground text-sm tracking-tight capitalize truncate"
            data-testid={`comment-report-row-reason-${report.reportId}`}
          >
            {formatReason(report.reason)}
          </span>
          <span
            className="text-2xs text-muted-foreground/80 shrink-0 font-medium"
            data-testid={`comment-report-row-timestamp-${report.reportId}`}
          >
            {timestampLabel}
          </span>
        </div>

        {report.details ? (
          <p className="text-xs text-muted-foreground line-clamp-1 italic">
            &ldquo;{report.details}&rdquo;
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <span data-testid={`comment-report-row-reporter-${report.reportId}`}>
            Reporter <span className="font-mono">{formatShortId(report.reporterId)}</span>
          </span>
          <span>•</span>
          <span data-testid={`comment-report-row-comment-${report.reportId}`}>
            Comment <span className="font-mono">{formatShortId(report.commentId)}</span>
          </span>
        </div>
      </div>

      {/* Pill & Actions */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <Badge
          variant={statusView.tone === "slate" ? "secondary" : "default"}
          data-testid={`comment-report-row-pill-${report.reportId}`}
          data-pill={statusView.pill}
          className={cn(
            "text-2xs capitalize px-1.5 py-0.5",
            statusView.tone === "emerald"
              ? "border-transparent bg-success/15 text-success dark:bg-success/20 dark:text-success"
              : "",
          )}
        >
          {statusView.label}
        </Badge>

        <div
          data-testid={`comment-report-row-actions-${report.reportId}`}
          className="shrink-0"
        >
          <CommentReportActionMenu
            report={report}
            commentAuthorId={commentAuthorId}
            onAction={handleAction}
          />
        </div>
      </div>
    </div>
  );
});
