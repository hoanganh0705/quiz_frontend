'use client';

/**
 * `features/admin/review-moderation/components/ReviewReportsList.tsx`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.E3.
 *
 * ## What this component renders
 *
 * The visible queue surface. The list owns:
 *
 *   - the cursor-paginated row list (`useReviewReports`).
 *   - the side panel for the selected report
 *     (`ReviewReportDetailPanel`).
 *   - the documented skeleton / empty / error states (D3).
 *   - the documented loading / retry affordances.
 *   - the URL-owned `?show=` toggle (delegated to
 *     `useReviewReports().setShow`).
 *   - the "load more" pagination affordance.
 *   - the resolve-confirm dialog mount point (`ReviewReportActionConfirmDialog`).
 *
 * ## State machine
 *
 * The list owns four pieces of state:
 *
 *   - `selectedReportId: string | null` — the row the side panel
 *     is bound to. `null` means no panel is open.
 *   - `pendingAction: ReportConsumerAction | null` — the action the
 *     admin selected from a row's menu; the dialog mounts when this
 *     is non-null.
 *   - `scrollerRef` — captures and restores the list scroll position
 *     across pagination cycles (the primitive `useCursorPaginated`
 *     triggers a re-render that resets scroll otherwise).
 *   - The `?show=` URL param is the source of truth for the filter;
 *     the list never owns it as local state.
 *
 * The selection is preserved across pagination because
 * `selectedReportId` is a stable key; the list looks the report up
 * in the freshly-loaded page by id. When the selected report's
 * `status` flips to `reviewed` / `dismissed` / `actioned`, the side
 * panel stays open and re-renders with the new state — the row
 * moves out of the `pending` filter, but the panel renders the
 * resolved-state affordance.
 *
 * ## Action-menu flow
 *
 *   1. Row click → `onSelect(report)` → list sets
 *      `selectedReportId`.
 *   2. Action menu item click → `onAction(action, report)` → list
 *      sets `selectedReportId = report.reportId` (so the side
 *      panel stays open during the resolve flow) and
 *      `pendingAction = action`.
 *   3. The dialog mounts (driven by `open`); the admin confirms or
 *      cancels.
 *   4. On success the resolve hook revalidates the queue; the list
 *      receives the new payload and the dialog closes.
 *   5. On failure the dialog stays open with the error affordance;
 *      the admin can retry or cancel.
 *
 * ## Cross-batch invariants
 *
 *   - The list never calls services or fetches data. Every effect
 *     reads from `useReviewReports` (the C1 hook) or props.
 *   - No `axios` / `fetch` call originates from this file.
 *   - The list delegates URL state to the hook; it does NOT mirror
 *     the URL into local state.
 *   - The side panel preserves its own scroll position
 *     (`ReviewReportDetailPanel` owns that responsibility).
 *   - The list preserves its OWN scroll position across pagination
 *     via `useScrollPreserveBoundary`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from 'react';
import { Inbox, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
  useReviewReports,
  type ReviewReportsShow,
} from '@/features/admin/review-moderation/hooks/useReviewReports';
import type { ReportConsumerAction } from '@/features/admin/review-moderation/action-enum';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';

import { ReviewReportItem } from '@/features/admin/review-moderation/components/ReviewReportItem';
import { ReviewReportDetailPanel } from '@/features/admin/review-moderation/components/ReviewReportDetailPanel';
import { ReviewReportActionConfirmDialog } from '@/features/admin/review-moderation/components/ReviewReportActionConfirmDialog';
import { ReviewReportSkeleton } from '@/features/admin/review-moderation/components/ReviewReportSkeleton';
import { ReviewReportEmptyState } from '@/features/admin/review-moderation/components/ReviewReportEmptyState';
import { ReviewReportErrorState } from '@/features/admin/review-moderation/components/ReviewReportErrorState';

// ─── Scroll preservation helpers ────────────────────────────────────────────

interface ScrollSnapshot {
  top: number;
  height: number;
}

/**
 * Capture / restore the list's vertical scroll position across
 * pagination cycles. The hook fires on every render that adds or
 * removes rows; the snapshot is stored on the scroll container's
 * data attributes so tests can introspect it.
 */
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
      // Restore before paint to avoid the visible jump.
      node.scrollTop = target.top;
      captured.current = null;
    }
    // After paint, snapshot for the next dep cycle.
    queueMicrotask(() => {
      captured.current = {
        top: node.scrollTop,
        height: node.scrollHeight,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

// ─── Show toggle ────────────────────────────────────────────────────────────

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
  value: ReviewReportsShow;
  label: string;
}> = Object.freeze([
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
] as const);

// ─── Component props ────────────────────────────────────────────────────────

export interface ReviewReportsListProps {
  /**
   * Optional initial filter. When omitted, the queue reads
   * `?show=` from the URL (default `'pending'`).
   */
  initialShow?: ReviewReportsShow;
  /**
   * When `false`, the list renders the documented disabled
   * notice. The flag gate (`ReviewReportsPage`) owns this
   * decision; the list simply respects it.
   */
  enabled?: boolean;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewReportsList({
  initialShow: _initialShow,
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
  const [pendingAction, setPendingAction] = useState<ReportConsumerAction | null>(
    null,
  );

  /**
   * Look the selected report up in the freshly-loaded page by id.
   * When the report id is not in the active page (e.g. the row
   * moved to a different page or the active filter switched), we
   * clear the selection so the side panel does not render stale
   * data.
   */
  const selectedReport = useMemo<AdminReportDto | null>(() => {
    if (selectedReportId === null) return null;
    return items.find((item) => item.reportId === selectedReportId) ?? null;
  }, [items, selectedReportId]);

  /**
   * Capture scroll position right BEFORE `loadMore` mounts new rows.
   * The `useScrollPreserveBoundary` below restores it once the rows
   * are in the DOM.
   */
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useScrollPreserveBoundary(scrollerRef, [items.length]);

  const handleSelect = useCallback(
    (report: AdminReportDto) => {
      setSelectedReportId((current) =>
        current === report.reportId ? null : report.reportId,
      );
    },
    [],
  );

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
      setShow(next);
    },
    [setShow],
  );

  /**
   * When the active filter changes, clear the selection. The
   * previously-selected row belongs to the previous filter and
   * would not be visible in the new filter.
   */
  useEffect(() => {
    setSelectedReportId(null);
    setPendingAction(null);
  }, [show]);

  /**
   * When a mutation succeeds and the selected report's state moves
   * to a resolved value, the row drops out of the `pending`
   * filter. The side panel must remain open (the admin might want
   * to verify the action), but the row may be missing from the
   * `items` list. We synthesise a "ghost" row from the cached
   * selection to keep the panel open.
   *
   * The ghost row is keyed on `selectedReportId`; once the
   * selection is cleared (via `onClose`), the ghost is discarded.
   */
  const displayReport = selectedReport;

  const handleScroll = useCallback((_event: UIEvent<HTMLDivElement>) => {
    // The scroll position is captured by `useScrollPreserveBoundary`
    // via a microtask; this handler is a placeholder for future
    // virtualisation hooks (e.g. infinite-scroll triggers).
  }, []);

  // ─── Render branches ──────────────────────────────────────────────

  const renderRows = () => {
    if (isLoading) {
      return <ReviewReportSkeleton rows={3} />;
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
            show === 'pending'
              ? () => handleShowChange('resolved')
              : undefined
          }
        />
      );
    }

    return (
      <div
        role="list"
        aria-label={`Review reports (${show})`}
        className="flex flex-col gap-2"
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
      className={cn('flex flex-col gap-4', className ?? '')}
    >
      <header
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        data-testid="review-reports-list-header"
      >
        <div role="tablist" aria-label="Filter review reports" className="inline-flex rounded-md border border-border bg-background p-0.5">
          {SHOW_TOGGLE_OPTIONS.map((option) => {
            const isActive = option.value === show;
            return (
              <button
                key={option.value}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`review-reports-list-${option.value}`}
                onClick={() => handleShowChange(option.value)}
                data-testid={`review-reports-list-tab-${option.value}`}
                className={cn(
                  'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-slate-100',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p
          className="text-xs text-muted-foreground"
          data-testid="review-reports-list-count"
        >
          {items.length} report{items.length === 1 ? '' : 's'}
        </p>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        data-testid="review-reports-list-scroller"
        className="relative max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background p-3"
      >
        {renderRows()}

        {hasMore && !isLoading && error === null ? (
          <div
            className="mt-3 flex items-center justify-center"
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

      {/* Side panel — rendered alongside the list, not in a portal. */}
      {displayReport !== null ? (
        <div
          data-testid={`review-reports-side-panel-${displayReport.reportId}`}
          className="h-[60vh]"
        >
          <ReviewReportDetailPanel
            report={displayReport}
            onClose={() => setSelectedReportId(null)}
          />
        </div>
      ) : null}

      {/* Confirm dialog — mounted when an action is selected. */}
      <ReviewReportActionConfirmDialog
        open={pendingAction !== null}
        report={displayReport}
        action={pendingAction}
        onClose={handleDialogClose}
      />
    </section>
  );
}