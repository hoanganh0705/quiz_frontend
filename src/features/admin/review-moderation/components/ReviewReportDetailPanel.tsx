"use client";

import { useCallback, useEffect, useRef } from "react";
import { Star, X, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import type { AdminReportDto } from "@/features/admin/review-moderation/admin-report-types";
import type { ReportConsumerAction } from "@/features/admin/review-moderation/action-enum";
import { useReview } from "@/features/admin/review-moderation/hooks/useReview";
import { useResolveReviewReport } from "@/features/admin/review-moderation/hooks/useResolveReviewReport";

function formatTimestamp(value: string | null | undefined): string {
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

export interface ReviewReportDetailPanelProps {
  report: AdminReportDto;

  onClose: () => void;

  onAction?: (action: ReportConsumerAction, report: AdminReportDto) => void;

  className?: string;
}

export function ReviewReportDetailPanel({
  report,
  onClose,
  onAction,
  className,
}: ReviewReportDetailPanelProps): React.ReactElement {
  const {
    review,
    isLoading: isReviewLoading,
    error: reviewError,
  } = useReview(report.reviewId);

  const { isPending: isResolving } = useResolveReviewReport();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const captureScroll = useCallback(() => {
    const node = scrollRef.current;
    if (node === null) return;
    node.setAttribute("data-scroll-top", String(node.scrollTop));
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node === null) return;
    const captured = node.getAttribute("data-scroll-top");
    if (typeof captured === "string" && captured.length > 0) {
      const value = Number(captured);
      if (!Number.isNaN(value)) {
        node.scrollTop = value;
      }
    }
    captureScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.reportId]);

  const handleClose = useCallback(() => {
    captureScroll();
    onClose();
  }, [captureScroll, onClose]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    },
    [handleClose],
  );

  return (
    <aside
      role="complementary"
      aria-label={`Offending review for report ${report.reportId}`}
      onKeyDown={handleKeyDown}
      data-testid={`review-report-detail-panel-${report.reportId}`}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card",
        className ?? "",
      )}
    >
      <header
        className="flex items-start justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4"
        data-testid={`review-report-detail-header-${report.reportId}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">
            Offending Review
          </h2>
          <p className="text-xs text-muted-foreground">
            Report ID: <span className="font-mono text-foreground/80">{report.reportId}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close detail panel"
          onClick={handleClose}
          data-testid={`review-report-detail-close-${report.reportId}`}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        data-testid={`review-report-detail-scroll-${report.reportId}`}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
      >
        {/* Snapshot block — always rendered */}
        <section
          className="rounded-lg border border-border bg-muted/30 p-4"
          data-testid={`review-report-detail-snapshot-${report.reportId}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Snapshot at report time
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {report.quizTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reported by{" "}
            <span className="font-medium text-foreground">
              {report.reviewerUsername}
            </span>
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  className={cn(
                    "size-4",
                    index < report.rating
                      ? "fill-warning text-warning"
                      : "fill-transparent text-muted-foreground/30",
                  )}
                />
              ))}
            </span>
            <span className="font-mono text-xs font-medium text-foreground">
              {report.rating}/5
            </span>
          </div>

          {report.comment !== null && report.comment !== undefined ? (
            <p className="mt-3 rounded-md border border-border/80 bg-background/80 p-3 text-sm italic text-foreground">
              &ldquo;{report.comment}&rdquo;
            </p>
          ) : (
            <p className="mt-3 text-xs italic text-muted-foreground">
              The reviewer did not leave a comment.
            </p>
          )}

          <div className="mt-3 space-y-1 text-xs text-foreground">
            <p>
              <span className="text-muted-foreground">Reported Reason: </span>
              <span className="font-semibold capitalize">
                {report.reason.replace(/_/g, " ")}
              </span>
            </p>
            {report.details !== null && report.details !== undefined ? (
              <p className="text-muted-foreground pt-1">
                {report.details}
              </p>
            ) : null}
          </div>
        </section>

        {/* Live-fetch fallback block */}
        <section
          className="rounded-lg border border-border bg-card p-4"
          data-testid={`review-report-detail-live-${report.reportId}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Review State
            </p>
            <Badge variant="outline" className="text-xs font-normal">
              Fetched from server
            </Badge>
          </div>

          {isReviewLoading ? (
            <p
              className="mt-2 text-xs text-muted-foreground"
              data-testid={`review-report-detail-live-loading-${report.reportId}`}
            >
              Loading live review status…
            </p>
          ) : review !== null ? (
            <div className="mt-2.5 flex flex-col gap-1.5 text-xs text-foreground">
              <p>
                <span className="text-muted-foreground">Author: </span>
                <span className="font-medium">{review.username}</span>{" "}
                <span className="font-mono text-muted-foreground">({review.userId})</span>
              </p>
              <p>
                <span className="text-muted-foreground">Helpful votes: </span>
                <span className="font-mono font-medium">{review.helpfulCount}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Created: </span>
                <span className="font-mono">{formatTimestamp(review.createdAt)}</span>
              </p>
              {review.updatedAt !== review.createdAt ? (
                <p>
                  <span className="text-muted-foreground">Last updated: </span>
                  <span className="font-mono">{formatTimestamp(review.updatedAt)}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <p
              className="mt-2 text-xs text-muted-foreground"
              data-testid={`review-report-detail-live-empty-${report.reportId}`}
            >
              The live review is no longer accessible. The snapshot above remains authoritative.
            </p>
          )}

          {reviewError !== null ? (
            <p
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-warning"
              role="status"
              data-testid={`review-report-detail-live-error-${report.reportId}`}
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Live review is unavailable; the snapshot above is preserved.</span>
            </p>
          ) : null}
        </section>

        {/* Audit trail block */}
        {report.status !== "open" ? (
          <section
            className="flex items-start gap-2.5 rounded-lg border border-success/35 bg-success/10 p-3.5 text-xs text-success dark:bg-success/20"
            data-testid={`review-report-detail-resolved-${report.reportId}`}
          >
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">This report has been resolved.</p>
              {report.updatedAt !== null && report.updatedAt !== undefined ? (
                <p className="font-mono">
                  Closed at: {formatTimestamp(report.updatedAt)}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      <footer
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3"
        data-testid={`review-report-detail-footer-${report.reportId}`}
      >
        <p className="text-xs text-muted-foreground">
          {isResolving
            ? "Resolving…"
            : report.status === "open"
              ? "Awaiting moderation."
              : "Closed."}
        </p>

        <div className="flex items-center gap-2">
          {report.status === "open" && onAction ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAction("dismiss", report)}
                className="text-xs"
              >
                Dismiss Report
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onAction("delete_review", report)}
                className="gap-1.5 text-xs"
              >
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                <span>Take Down</span>
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid={`review-report-detail-close-footer-${report.reportId}`}
          >
            Close
          </Button>
        </div>
      </footer>
    </aside>
  );
}
