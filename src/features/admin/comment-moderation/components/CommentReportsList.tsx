"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Inbox, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { getQueryClient } from "@/providers/QueryProvider";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useCommentReports,
  type CommentReportsShow,
} from "@/features/admin/comment-moderation/hooks/useCommentReports";
import { commentIdKey } from "@/features/admin/comment-moderation/hooks/commentIdKeys";
import type { CommentReportConsumerAction } from "@/features/admin/comment-moderation/action-enum";
import type { CommentReportDto } from "@/features/admin/comment-moderation/admin-comment-report-types";

import { CommentReportItem } from "@/features/admin/comment-moderation/components/CommentReportItem";
import { CommentReportDetailPanel } from "@/features/admin/comment-moderation/components/CommentReportDetailPanel";
import { CommentReportActionConfirmDialog } from "@/features/admin/comment-moderation/components/CommentReportActionConfirmDialog";
import { RestoreCommentDialog } from "@/features/admin/comment-moderation/components/CommentVisibilityDialogs";
import { CommentReportSkeleton } from "@/features/admin/comment-moderation/components/CommentReportStates";

import type { CommentDto } from "@/lib/api/generated/schemas";

interface ScrollSnapshot {
  top: number;
  height: number;
}

function useScrollPreserveBoundary(
  scrollRef: React.RefObject<HTMLElement | null>,
  dependencies: ReadonlyArray<unknown>,
): void {
  const captured = useRef<ScrollSnapshot | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node === null) return;
    const target = captured.current;
    if (target !== null) {
      node.scrollTop = target.top;
      captured.current = null;
    }

    queueMicrotask(() => {
      captured.current = {
        top: node.scrollTop,
        height: node.scrollHeight,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

function readCommentAuthorId(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  const unwrapped =
    "data" in value && (value as { data: unknown }).data !== undefined
      ? (value as { data: unknown }).data
      : value;
  if (unwrapped === null || typeof unwrapped !== "object") return null;
  const candidate = unwrapped as Partial<CommentDto>;
  return typeof candidate.authorId === "string" && candidate.authorId.length > 0
    ? candidate.authorId
    : null;
}

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
  value: CommentReportsShow;
  label: string;
}> = Object.freeze([
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
] as const);

export interface CommentReportsListProps {
  initialShow?: CommentReportsShow;

  enabled?: boolean;

  className?: string;
}

export function CommentReportsList({
  enabled = true,
  className,
}: CommentReportsListProps): React.ReactElement {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    show,
    setShow,
  } = useCommentReports({ enabled });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<CommentReportConsumerAction | null>(null);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

  const [prevShow, setPrevShow] = useState(show);
  if (prevShow !== show) {
    setPrevShow(show);
    setSelectedReportId(null);
    setPendingAction(null);
  }

  const selectedReport = useMemo<CommentReportDto | null>(() => {
    if (selectedReportId === null) return null;
    return items.find((item) => item.reportId === selectedReportId) ?? null;
  }, [items, selectedReportId]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useScrollPreserveBoundary(scrollerRef, [items.length]);

  const handleSelect = useCallback((report: CommentReportDto) => {
    setSelectedReportId((current) =>
      current === report.reportId ? null : report.reportId,
    );
  }, []);

  const handleAction = useCallback(
    (action: CommentReportConsumerAction, report: CommentReportDto) => {
      setSelectedReportId(report.reportId);
      setPendingAction(action);
    },
    [],
  );

  const handleDetailAction = useCallback(
    (action: CommentReportConsumerAction) => {
      setPendingAction(action);
    },
    [],
  );

  const handleDialogClose = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleShowChange = useCallback(
    (next: CommentReportsShow) => {
      setShow(next);
    },
    [setShow],
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: CommentReportsShow) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const next: CommentReportsShow = current === "pending" ? "resolved" : "pending";
        handleShowChange(next);
        const el = document.querySelector<HTMLButtonElement>(
          `[data-testid="comment-reports-list-tab-${next}"]`,
        );
        el?.focus();
      }
    },
    [handleShowChange],
  );

  const handleRestore = useCallback((commentId: string) => {
    setRestoreTargetId(commentId);
  }, []);

  const handleRestoreClose = useCallback(() => {
    setRestoreTargetId(null);
  }, []);

  const handleScroll = useCallback(() => {
    // Scroll boundary tracking
  }, []);

  const authorIdByReportId = useMemo(() => {
    const map = new Map<string, string | null>();
    let qc: ReturnType<typeof getQueryClient> | null = null;
    try {
      qc = getQueryClient();
    } catch {}
    for (const item of items) {
      const rawKey = commentIdKey(item.commentId);
      const qcData = qc
        ? (qc.getQueryData(rawKey) as { authorId?: string | null } | undefined)
        : undefined;
      map.set(item.reportId, readCommentAuthorId(qcData));
    }
    return map;
  }, [items]);

  const renderRows = () => {
    if (isLoading) {
      return <CommentReportSkeleton rows={3} />;
    }

    if (error !== null) {
      return (
        <div
          role="alert"
          data-testid="comment-reports-list-error"
          className="rounded-md border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 px-4 py-3 text-xs text-foreground"
        >
          <p className="font-semibold text-destructive">Could not load comment reports</p>
          <p className="mt-1 text-muted-foreground">
            The queue did not respond. Use the retry button to try again.
          </p>
          <div className="mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void refresh();
              }}
              data-testid="comment-reports-list-retry"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div
          role="status"
          data-testid={`comment-reports-list-empty-${show}`}
          className="rounded-xl border border-dashed border-border/70 bg-card/25 px-4 py-12 text-center text-sm text-muted-foreground"
        >
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Inbox className="size-6 text-muted-foreground/80" aria-hidden="true" />
          </div>
          <p className="font-semibold text-foreground text-base">
            No {show === "pending" ? "pending" : "resolved"} comment reports
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
            {show === "pending"
              ? "All caught up! No comment reports are awaiting moderation right now."
              : "No resolved comment reports match this filter."}
          </p>
          {show === "pending" ? (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleShowChange("resolved")}
                data-testid="comment-reports-list-show-resolved"
              >
                View resolved history
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        role="list"
        aria-label={`Comment reports (${show})`}
        className="flex flex-col gap-2.5"
        data-testid={`comment-reports-list-${show}`}
      >
        {items.map((report) => (
          <CommentReportItem
            key={report.reportId}
            report={report}
            commentAuthorId={authorIdByReportId.get(report.reportId) ?? null}
            onSelect={handleSelect}
            onAction={handleAction}
            selected={selectedReportId === report.reportId}
          />
        ))}
      </div>
    );
  };

  return (
    <section
      data-testid="comment-reports-list"
      className={cn("flex flex-col gap-5", className ?? "")}
    >
      <header
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="comment-reports-list-header"
      >
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Filter comment reports"
            className="inline-flex rounded-md border border-border bg-background p-0.5"
          >
            {SHOW_TOGGLE_OPTIONS.map((option) => {
              const isActive = option.value === show;
              return (
                <button
                  key={option.value}
                  role="tab"
                  type="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={`comment-reports-list-${option.value}`}
                  onClick={() => handleShowChange(option.value)}
                  onKeyDown={(e) => handleTabKeyDown(e, option.value)}
                  data-testid={`comment-reports-list-tab-${option.value}`}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Refresh queue"
          >
            <RefreshCw className={cn("size-3.5", isLoading ? "animate-spin" : "")} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <p
          className="text-xs text-muted-foreground"
          data-testid="comment-reports-list-count"
        >
          {items.length} {show === "pending" ? "pending" : "resolved"} report{items.length === 1 ? "" : "s"}
        </p>
      </header>

      {/* Persistent 12-column master-detail grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Triage Queue List (5 columns) */}
        <div className="flex flex-col gap-4 lg:col-span-5 w-full">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            data-testid="comment-reports-list-scroller"
            className="relative max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-card/40 p-3 shadow-2xs"
          >
            {renderRows()}

            {hasMore && !isLoading && error === null ? (
              <div
                className="mt-3 flex items-center justify-center"
                data-testid="comment-reports-list-load-more"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadMore();
                  }}
                  disabled={isLoadingMore}
                  data-testid="comment-reports-list-load-more-button"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Inbox className="mr-2 h-4 w-4" aria-hidden="true" />
                      Load more
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Master-detail Review Console (7 columns) */}
        {selectedReport !== null ? (
          <div
            data-testid={`comment-reports-side-panel-${selectedReport.reportId}`}
            className="lg:col-span-7 h-[75vh] sticky top-6"
          >
            <CommentReportDetailPanel
              report={selectedReport}
              onClose={() => setSelectedReportId(null)}
              onRestore={handleRestore}
              onAction={handleDetailAction}
            />
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 h-[75vh] sticky top-6 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/25 p-8 text-center text-muted-foreground">
            <div className="rounded-full bg-muted/60 p-4 mb-3 text-muted-foreground">
              <ShieldAlert className="size-8" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-foreground">
              No report selected
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
              Select a report from the moderation queue on the left to inspect the offending comment, author details, and take action.
            </p>
          </div>
        )}
      </div>

      {/* Confirm dialog — mounted when an action is selected */}
      <CommentReportActionConfirmDialog
        open={pendingAction !== null}
        report={selectedReport}
        action={pendingAction}
        onClose={handleDialogClose}
      />

      {/* Restore dialog — side-channel from the hidden-state affordance */}
      <RestoreCommentDialog
        open={restoreTargetId !== null}
        commentId={restoreTargetId}
        onClose={handleRestoreClose}
      />
    </section>
  );
}
