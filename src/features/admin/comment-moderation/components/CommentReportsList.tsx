'use client';

/**
 * `features/admin/comment-moderation/components/CommentReportsList.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.E3.
 *
 * ## What this component renders
 *
 * The visible queue surface. The list owns:
 *
 *   - the cursor-paginated row list (`useCommentReports`).
 *   - the side panel for the selected report
 *     (`CommentReportDetailPanel`).
 *   - the documented skeleton / empty / error states (D4).
 *   - the documented loading / retry affordances.
 *   - the URL-owned `?show=` toggle (delegated to
 *     `useCommentReports().setShow`).
 *   - the "load more" pagination affordance.
 *   - the resolve-confirm dialog mount point (`CommentReportActionConfirmDialog`).
 *   - the side-channel restore dialog mount point (`RestoreCommentDialog`).
 *
 * ## State machine
 *
 * The list owns four pieces of state:
 *
 *   - `selectedReportId: string | null` — the row the side panel
 *     is bound to. `null` means no panel is open.
 *   - `pendingAction: CommentReportConsumerAction | null` — the
 *     action the admin selected from a row's menu; the dialog
 *     mounts when this is non-null.
 *   - `restoreTargetId: string | null` — the comment id whose
 *     restore dialog is open; mounts `RestoreCommentDialog` when
 *     non-null.
 *   - `scrollerRef` — captures and restores the list scroll
 *     position across pagination cycles (the primitive
 *     `useCursorPaginated` triggers a re-render that resets scroll
 *     otherwise).
 *
 * The selection is preserved across pagination because
 * `selectedReportId` is a stable key; the list looks the report up
 * in the freshly-loaded page by id. When the selected report's
 * `status` flips to a resolved value, the side panel stays open
 * and re-renders with the new state — the row moves out of the
 * `pending` filter, but the panel renders the resolved-state
 * affordance.
 *
 * ## Comment author lookup (self-moderation gate)
 *
 * Each row's action menu needs the offending comment's
 * `authorId` to gate the self-moderation check (TKT-7.6.D1). The
 * list reads the SWR cache via `useSWRConfig()` for the comment
 * author id and forwards the value to each row. The cache is
 * populated by the hidden `useComment` hook the list mounts for
 * the currently selected report; the detail panel's own
 * `useComment` mount keeps the cache hot during the panel render.
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
 *     reads from `useCommentReports` (the C1 hook) or props.
 *   - No `axios` / `fetch` call originates from this file.
 *   - The list delegates URL state to the hook; it does NOT mirror
 *     the URL into local state.
 *   - The side panel preserves its own scroll position
 *     (`CommentReportDetailPanel` owns that responsibility).
 *   - The list preserves its OWN scroll position across pagination
 *     via a local scroll-snapshot effect.
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
import { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
  useCommentReports,
  type CommentReportsShow,
} from '@/features/admin/comment-moderation/hooks/useCommentReports';
import { useComment } from '@/features/admin/comment-moderation/hooks/useComment';
import { commentIdKey } from '@/features/admin/comment-moderation/hooks/commentIdKeys';
import type { CommentReportConsumerAction } from '@/features/admin/comment-moderation/action-enum';
import type {
  CommentReportDto,
} from '@/features/admin/comment-moderation/admin-comment-report-types';

import { CommentReportItem } from '@/features/admin/comment-moderation/components/CommentReportItem';
import { CommentReportDetailPanel } from '@/features/admin/comment-moderation/components/CommentReportDetailPanel';
import { CommentReportActionConfirmDialog } from '@/features/admin/comment-moderation/components/CommentReportActionConfirmDialog';
import { RestoreCommentDialog } from '@/features/admin/comment-moderation/components/CommentVisibilityDialogs';
import { CommentReportSkeleton } from '@/features/admin/comment-moderation/components/CommentReportStates';

import type { CommentDto } from '@/lib/api/generated/schemas';

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function readCommentAuthorId(value: unknown): string | null {
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Partial<CommentDto>;
  return typeof candidate.authorId === 'string' && candidate.authorId.length > 0
    ? candidate.authorId
    : null;
}

/**
 * Hidden helper component. Mounts `useComment` for the supplied id
 * so the SWR cache stays hot while the side panel is rendering the
 * live comment. The list reads the same cache via
 * `useSWRConfig().cache.get(key)` to forward the resolved
 * `authorId` to each row's action menu.
 */
function CommentCacheWarmer({ commentId }: { commentId: string }): null {
  useComment({ commentId });
  return null;
}

// ─── Show toggle ────────────────────────────────────────────────────────────

const SHOW_TOGGLE_OPTIONS: ReadonlyArray<{
  value: CommentReportsShow;
  label: string;
}> = Object.freeze([
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
] as const);

// ─── Component props ────────────────────────────────────────────────────────

export interface CommentReportsListProps {
  /**
   * Optional initial filter. When omitted, the queue reads
   * `?show=` from the URL (default `'pending'`).
   */
  initialShow?: CommentReportsShow;
  /**
   * When `false`, the list renders the documented disabled
   * notice. The flag gate (`CommentReportsPage`) owns this
   * decision; the list simply respects it.
   */
  enabled?: boolean;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommentReportsList({
  initialShow: _initialShow,
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

  const { cache } = useSWRConfig();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CommentReportConsumerAction | null>(
    null,
  );
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

  /**
   * Look the selected report up in the freshly-loaded page by id.
   * When the report id is not in the active page (e.g. the row
   * moved to a different page or the active filter switched), we
   * clear the selection so the side panel does not render stale
   * data.
   */
  const selectedReport = useMemo<CommentReportDto | null>(() => {
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
    (report: CommentReportDto) => {
      setSelectedReportId((current) =>
        current === report.reportId ? null : report.reportId,
      );
    },
    [],
  );

  const handleAction = useCallback(
    (action: CommentReportConsumerAction, report: CommentReportDto) => {
      setSelectedReportId(report.reportId);
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

  const handleRestore = useCallback((commentId: string) => {
    setRestoreTargetId(commentId);
  }, []);

  const handleRestoreClose = useCallback(() => {
    setRestoreTargetId(null);
  }, []);

  /**
   * When the active filter changes, clear the selection. The
   * previously-selected row belongs to the previous filter and
   * would not be visible in the new filter.
   */
  useEffect(() => {
    setSelectedReportId(null);
    setPendingAction(null);
  }, [show]);

  const handleScroll = useCallback((_event: UIEvent<HTMLDivElement>) => {
    // The scroll position is captured by `useScrollPreserveBoundary`
    // via a microtask; this handler is a placeholder for future
    // virtualisation hooks (e.g. infinite-scroll triggers).
  }, []);

  /**
   * Compute the `commentAuthorId` for each row by reading the
   * SWR cache. The cache is populated by the detail panel's
   * `useComment` mount and by the `CommentCacheWarmer` below
   * (one warmer per row, never blocked by suspense). Missing
   * entries surface as `null` — the action menu treats that as
   * "unknown author", which keeps the self-moderation gate inert.
   */
  const authorIdByReportId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of items) {
      // The public SWR cache type only accepts `string`, but
      // internally it indexes both string and tuple keys via the
      // same hash. The double cast through `unknown` keeps the
      // access safe without disabling the broader type-check.
      const key = commentIdKey(item.commentId) as unknown as string;
      const cached = cache.get(key);
      const data = (cached as { data?: unknown } | undefined)?.data;
      map.set(item.reportId, readCommentAuthorId(data));
    }
    return map;
  }, [items, cache]);

  // ─── Render branches ──────────────────────────────────────────────

  const renderRows = () => {
    if (isLoading) {
      return <CommentReportSkeleton rows={3} />;
    }

    if (error !== null) {
      return (
        <div
          role="alert"
          data-testid="comment-reports-list-error"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-900"
        >
          <p className="font-semibold">Could not load comment reports</p>
          <p className="mt-1">
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
          className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-muted-foreground"
        >
          <Inbox className="mx-auto h-6 w-6" aria-hidden="true" />
          <p className="mt-2 font-medium text-foreground">
            No {show === 'pending' ? 'pending' : 'resolved'} comment reports
          </p>
          <p className="mt-1">
            {show === 'pending'
              ? 'No comment reports are awaiting moderation right now.'
              : 'No resolved comment reports match this filter.'}
          </p>
          {show === 'pending' ? (
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleShowChange('resolved')}
                data-testid="comment-reports-list-show-resolved"
              >
                View resolved reports
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
        className="flex flex-col gap-2"
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
      className={cn('flex flex-col gap-4', className ?? '')}
    >
      <header
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        data-testid="comment-reports-list-header"
      >
        <div role="tablist" aria-label="Filter comment reports" className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          {SHOW_TOGGLE_OPTIONS.map((option) => {
            const isActive = option.value === show;
            return (
              <button
                key={option.value}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`comment-reports-list-${option.value}`}
                onClick={() => handleShowChange(option.value)}
                data-testid={`comment-reports-list-tab-${option.value}`}
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
          data-testid="comment-reports-list-count"
        >
          {items.length} report{items.length === 1 ? '' : 's'}
        </p>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        data-testid="comment-reports-list-scroller"
        className="relative max-h-[70vh] overflow-y-auto rounded-md border border-slate-200 bg-white p-3"
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

      {/* Hidden warmers: keep the SWR cache populated for every
          comment id in the active page so each row's action menu
          can read the author id without an explicit click on the
          row. The warmers run alongside the visible rows; the
          comment payload is consumed by the side panel when the
          admin selects the corresponding row. */}
      {items.map((report) => (
        <CommentCacheWarmer key={`warmer-${report.reportId}`} commentId={report.commentId} />
      ))}

      {/* Side panel — rendered alongside the list, not in a portal. */}
      {selectedReport !== null ? (
        <div
          data-testid={`comment-reports-side-panel-${selectedReport.reportId}`}
          className="h-[60vh]"
        >
          <CommentReportDetailPanel
            report={selectedReport}
            onClose={() => setSelectedReportId(null)}
            onRestore={handleRestore}
          />
        </div>
      ) : null}

      {/* Confirm dialog — mounted when an action is selected. */}
      <CommentReportActionConfirmDialog
        open={pendingAction !== null}
        report={selectedReport}
        action={pendingAction}
        onClose={handleDialogClose}
      />

      {/* Restore dialog — side-channel from the hidden-state affordance. */}
      <RestoreCommentDialog
        open={restoreTargetId !== null}
        commentId={restoreTargetId}
        onClose={handleRestoreClose}
      />
    </section>
  );
}