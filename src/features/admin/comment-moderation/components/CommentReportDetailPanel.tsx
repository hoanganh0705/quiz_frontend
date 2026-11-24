"use client";

import { useCallback, useEffect, useRef } from "react";
import { X, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import type { CommentReportConsumerAction } from "@/features/admin/comment-moderation/action-enum";
import type { CommentReportDto } from "@/features/admin/comment-moderation/admin-comment-report-types";
import { useComment } from "@/features/admin/comment-moderation/hooks/useComment";
import { CommentHiddenState } from "@/features/admin/comment-moderation/components/CommentReportStates";
import type { CommentDto } from "@/lib/api/generated/schemas";

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

function readCommentDto(value: unknown): CommentDto | null {
  if (value === null || typeof value !== "object") return null;
  const candidate = value as Partial<CommentDto>;
  if (typeof candidate.id !== "string") return null;
  if (typeof candidate.body !== "string") return null;
  if (typeof candidate.authorId !== "string") return null;
  if (typeof candidate.isHidden !== "boolean") return null;
  return candidate as CommentDto;
}

function resolveCommentAuthorDisplay(comment: CommentDto): string {
  const author = comment.author;

  const rawDisplayName = author?.displayName as unknown as string | null;
  if (typeof rawDisplayName === "string" && rawDisplayName.length > 0) {
    return rawDisplayName;
  }
  const rawUsername = author?.username as unknown as string | null;
  if (typeof rawUsername === "string" && rawUsername.length > 0) {
    return rawUsername;
  }
  return comment.authorId;
}

export interface CommentReportDetailPanelProps {
  report: CommentReportDto;

  onClose: () => void;

  onRestore: (commentId: string) => void;

  onAction?: (action: CommentReportConsumerAction) => void;

  className?: string;
}

export function CommentReportDetailPanel({
  report,
  onClose,
  onRestore,
  onAction,
  className,
}: CommentReportDetailPanelProps): React.ReactElement {
  const {
    comment,
    isLoading: isCommentLoading,
    outcome: commentOutcome,
  } = useComment({ commentId: report.commentId });

  const commentDto = readCommentDto(comment);

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

  const handleRestore = useCallback(() => {
    captureScroll();
    onRestore(report.commentId);
  }, [captureScroll, onRestore, report.commentId]);

  const isHidden = commentDto !== null && commentDto.isHidden === true;

  return (
    <aside
      role="complementary"
      aria-label={`Offending comment for report ${report.reportId}`}
      onKeyDown={handleKeyDown}
      data-testid={`comment-report-detail-panel-${report.reportId}`}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className ?? "",
      )}
    >
      <header
        className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5 bg-muted/20"
        data-testid={`comment-report-detail-header-${report.reportId}`}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Offending Comment
          </h2>
          <p className="text-2xs text-muted-foreground">
            Report ID <span className="font-mono">{report.reportId}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close detail panel"
          onClick={handleClose}
          className="size-8"
          data-testid={`comment-report-detail-close-${report.reportId}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        data-testid={`comment-report-detail-scroll-${report.reportId}`}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
      >
        {/* Live-fetch block — Prominently feature the offending comment */}
        {isHidden && commentDto !== null ? (
          <CommentHiddenState
            commentId={commentDto.id}
            onRestore={handleRestore}
          />
        ) : (
          <section
            className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-2xs"
            data-testid={`comment-report-detail-live-${report.reportId}`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comment Content
              </span>
              <Badge variant="outline" className="text-2xs">
                Live Status
              </Badge>
            </div>

            {isCommentLoading ? (
              <div
                className="mt-3 flex flex-col gap-2.5"
                data-testid={`comment-report-detail-live-loading-${report.reportId}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-muted animate-pulse" />
                    <span className="h-4 w-28 rounded bg-muted animate-pulse" />
                  </div>
                  <span className="h-3 w-16 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-16 w-full rounded-md bg-muted/60 animate-pulse" />
              </div>
            ) : commentDto !== null ? (
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-semibold text-primary"
                      aria-hidden="true"
                    >
                      {resolveCommentAuthorDisplay(commentDto).charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">
                      {resolveCommentAuthorDisplay(commentDto)}
                    </span>
                    {commentDto.author?.username !== undefined ? (
                      <span className="text-muted-foreground">
                        (<span className="font-mono text-2xs">{commentDto.authorId}</span>)
                      </span>
                    ) : null}
                  </div>
                  <span className="text-2xs text-muted-foreground">
                    {formatTimestamp(commentDto.createdAt)}
                  </span>
                </div>

                <div
                  className="rounded-md border border-border/70 bg-muted/30 p-3.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words"
                  data-testid={`comment-report-detail-live-text-${report.reportId}`}
                >
                  {commentDto.body}
                </div>
              </div>
            ) : (
              <p
                className="mt-3 text-xs text-muted-foreground"
                data-testid={`comment-report-detail-live-empty-${report.reportId}`}
              >
                {commentOutcome === "not-found"
                  ? "The offending comment no longer exists. The report metadata below is still authoritative."
                  : "The live comment could not be loaded. The report metadata below is still authoritative."}
              </p>
            )}

            {commentOutcome === "forbidden" ? (
              <p
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-warning"
                role="status"
                data-testid={`comment-report-detail-live-error-${report.reportId}`}
              >
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                Live comment is unavailable; report metadata remains authoritative.
              </p>
            ) : null}
          </section>
        )}

        {/* Snapshot block — report metadata */}
        <section
          className="rounded-lg border border-border/80 bg-muted/30 p-4"
          data-testid={`comment-report-detail-snapshot-${report.reportId}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Report Details
          </p>

          <div className="mt-2.5 flex flex-col gap-2 text-xs text-foreground/85">
            <p>
              Reason:{" "}
              <span className="font-semibold text-foreground capitalize">
                {report.reason.replace(/_/g, " ")}
              </span>
            </p>
            {report.details ? (
              <p className="rounded-md border border-border/50 bg-background/50 p-2.5 text-foreground/90 italic">
                &ldquo;{report.details}&rdquo;
              </p>
            ) : null}
            <div className="mt-1 flex flex-col gap-1 text-2xs text-muted-foreground">
              <p>
                Filed by <span className="font-mono text-foreground">{report.reporterId}</span>
              </p>
              <p>Filed at {formatTimestamp(report.createdAt)}</p>
            </div>
          </div>
        </section>

        {/* Audit trail block — surfaced when the report is closed */}
        {report.status !== "open" ? (
          <section
            className="rounded-lg border border-success/30 bg-success/10 dark:bg-success/15 p-4 text-xs text-foreground"
            data-testid={`comment-report-detail-resolved-${report.reportId}`}
          >
            <p className="font-semibold text-success">This report has been resolved.</p>
            {report.updatedAt ? (
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Last updated:{" "}
                <span className="font-medium text-foreground">
                  {formatTimestamp(report.updatedAt)}
                </span>
              </p>
            ) : null}
            {report.reviewedAt ? (
              <p className="mt-1 text-2xs text-muted-foreground">
                Reviewed at:{" "}
                <span className="font-medium text-foreground">
                  {formatTimestamp(report.reviewedAt)}
                </span>
              </p>
            ) : null}
            {report.reviewedByUserId ? (
              <p className="mt-1 text-2xs text-muted-foreground">
                Reviewed by:{" "}
                <span className="font-mono text-foreground">{report.reviewedByUserId}</span>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border px-5 py-3.5 bg-muted/20"
        data-testid={`comment-report-detail-footer-${report.reportId}`}
      >
        <p className="text-xs text-muted-foreground">
          {report.status === "open" ? (
            <span className="inline-flex items-center gap-1.5 text-warning font-medium">
              <span className="size-1.5 rounded-full bg-warning animate-pulse" />
              Awaiting moderation action
            </span>
          ) : (
            <span className="text-muted-foreground">This report is closed.</span>
          )}
        </p>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {report.status === "open" && onAction ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAction("dismiss")}
                data-testid={`comment-report-detail-action-dismiss-${report.reportId}`}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onAction("mark_resolved")}
                data-testid={`comment-report-detail-action-resolve-${report.reportId}`}
              >
                Resolve
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onAction("hide_comment")}
                data-testid={`comment-report-detail-action-hide-${report.reportId}`}
              >
                Hide Comment
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              data-testid={`comment-report-detail-close-footer-${report.reportId}`}
            >
              Close
            </Button>
          )}
        </div>
      </footer>
    </aside>
  );
}
