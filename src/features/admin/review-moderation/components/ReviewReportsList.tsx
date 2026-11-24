"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Inbox, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useReviewReports,
  type ReviewReportsShow,
} from "@/features/admin/review-moderation/hooks/useReviewReports";
import type { ReportConsumerAction } from "@/features/admin/review-moderation/action-enum";
import type { AdminReportDto } from "@/features/admin/review-moderation/admin-report-types";

import { ReviewReportItem } from "@/features/admin/review-moderation/components/ReviewReportItem";
import { ReviewReportDetailPanel } from "@/features/admin/review-moderation/components/ReviewReportDetailPanel";
import { ReviewReportActionConfirmDialog } from "@/features/admin/review-moderation/components/ReviewReportActionConfirmDialog";
import { ReviewReportSkeleton } from "@/features/admin/review-moderation/components/ReviewReportSkeleton";
import { ReviewReportEmptyState } from "@/features/admin/review-moderation/components/ReviewReportEmptyState";
import { ReviewReportErrorState } from "@/features/admin/review-moderation/components/ReviewReportErrorState";

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

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
  value: ReviewReportsShow;
  label: string;
}> = Object.freeze([
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
] as const);

export interface ReviewReportsListProps {
  enabled?: boolean;

  className?: string;
}

export function ReviewReportsList({
  enabled = true,
  className,
}: ReviewReportsListProps): React.ReactElement {
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
  } = useReviewReports({ enabled });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ReportConsumerAction | null>(null);

  const selectedReport = useMemo<AdminReportDto | null>(() => {
    if (selectedReportId === null) return null;
    return items.find((item) => item.reportId === selectedReportId) ?? null;
  }, [items, selectedReportId]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  useScrollPreserveBoundary(scrollerRef, [items.length]);

  const handleSelect = useCallback((report: AdminReportDto) => {
    setSelectedReportId((current) =>
      current === report.reportId ? null : report.reportId,
    );
  }, []);

  const handleAction = useCallback(
    (action: ReportConsumerAction, report: AdminReportDto) => {
      setSelectedReportId(report.reportId);
      setPendingAction(action);
    },
    [],
  );

  const handleDialogClose = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleShowChange = useCallback(
    (next: ReviewReportsShow) => {
      setSelectedReportId(null);
      setPendingAction(null);
      setShow(next);
    },
    [setShow],
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex = -1;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % SHOW_TOGGLE_OPTIONS.length;
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextIndex =
          (currentIndex - 1 + SHOW_TOGGLE_OPTIONS.length) %
          SHOW_TOGGLE_OPTIONS.length;
      } else if (event.key === "Home") {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === "End") {
        event.preventDefault();
        nextIndex = SHOW_TOGGLE_OPTIONS.length - 1;
      }

      if (nextIndex >= 0) {
        const nextOption = SHOW_TOGGLE_OPTIONS[nextIndex];
        handleShowChange(nextOption.value);
        const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[role="tab"]',
        );
        buttons?.[nextIndex]?.focus();
      }
    },
    [handleShowChange],
  );

  const displayReport = selectedReport;

  const handleScroll = useCallback(() => {
    // Scroll tracking handled by useScrollPreserveBoundary
  }, []);

  const renderRows = () => {
    if (isLoading) {
      return <ReviewReportSkeleton rows={4} />;
    }

    if (error !== null) {
      return (
        <ReviewReportErrorState
          error={error}
          onRetry={() => {
            void refresh();
          }}
        />
      );
    }

    if (items.length === 0) {
      return (
        <ReviewReportEmptyState
          filter={show}
          onShowResolved={
            show === "pending" ? () => handleShowChange("resolved") : undefined
          }
        />
      );
    }

    return (
      <div
        role="list"
        aria-label={`Review reports (${show})`}
        className="flex flex-col gap-2.5"
        data-testid={`review-report-list-${show}`}
      >
        {items.map((report) => (
          <ReviewReportItem
            key={report.reportId}
            report={report}
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
      data-testid="review-reports-list"
      className={cn("flex flex-col gap-5", className ?? "")}
    >
      <header
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="review-reports-list-header"
      >
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Filter review reports"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
        >
          {SHOW_TOGGLE_OPTIONS.map((option, index) => {
            const isActive = option.value === show;
            return (
              <button
                key={option.value}
                role="tab"
                type="button"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls={`review-reports-list-${option.value}`}
                onClick={() => handleShowChange(option.value)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                data-testid={`review-reports-list-tab-${option.value}`}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <p
            className="text-xs font-mono font-medium text-muted-foreground"
            data-testid="review-reports-list-count"
          >
            {items.length} report{items.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Refresh reports list"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Master-detail 12-column responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Moderation Queue List (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            data-testid="review-reports-list-scroller"
            className="relative min-h-[420px] max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            {renderRows()}

            {hasMore && !isLoading && error === null ? (
              <div
                className="mt-4 flex items-center justify-center pt-2 border-t border-border/50"
                data-testid="review-reports-list-load-more"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadMore();
                  }}
                  disabled={isLoadingMore}
                  data-testid="review-reports-list-load-more-button"
                  className="gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span>Loading…</span>
                    </>
                  ) : (
                    <>
                      <Inbox className="size-4" aria-hidden="true" />
                      <span>Load more</span>
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column: Inspector & Action Console (7 columns) */}
        {displayReport !== null ? (
          <div
            data-testid={`review-reports-side-panel-${displayReport.reportId}`}
            className="lg:col-span-7 h-[75vh] lg:sticky lg:top-6 flex flex-col"
          >
            <ReviewReportDetailPanel
              report={displayReport}
              onClose={() => setSelectedReportId(null)}
              onAction={handleAction}
            />
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 h-[75vh] lg:sticky lg:top-6 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/25 p-8 text-center text-muted-foreground">
            <div className="rounded-full bg-muted/60 p-4 mb-3 text-muted-foreground">
              <ShieldAlert className="size-8" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-foreground">
              No report selected
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
              Select a review report from the queue on the left to inspect the offending review, view author details, and execute moderation actions.
            </p>
          </div>
        )}
      </div>

      {/* Confirm dialog — mounted when an action is selected */}
      <ReviewReportActionConfirmDialog
        open={pendingAction !== null}
        report={displayReport}
        action={pendingAction}
        onClose={handleDialogClose}
      />
    </section>
  );
}
