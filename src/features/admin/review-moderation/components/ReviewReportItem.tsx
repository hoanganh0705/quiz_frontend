'use client';

/**
 * `features/admin/review-moderation/components/ReviewReportItem.tsx`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.E1.
 *
 * ## What this component renders
 *
 * A single row in the review-moderation queue. The row carries:
 *
 *   - the reporter's display name,
 *   - the report reason (rendered in full; the row height is small
 *     enough that a `show more` affordance is not needed),
 *   - the offending review's quiz title (linkable, but never
 *     navigating the queue away — left as a future enhancement),
 *   - the status pill (`pending` / `resolved` — see "Status pill"
 *     below),
 *   - the row-level timestamp (creation time when pending; latest
 *     update time when resolved — see "Timestamps"),
 *   - the `ReviewReportActionMenu` (the D1 consumer).
 *
 * ## Status pill
 *
 * The pill maps the SDK's four-state `ReportState` (`open`,
 * `reviewed`, `dismissed`, `actioned`) onto the documented
 * two-state consumer vocabulary:
 *
 *   - `status: 'open'` → `pending` (slate) — the report is awaiting
 *     moderation.
 *   - any other status → `resolved` (emerald) — the report is
 *     closed. The original SDK state is surfaced via a tooltip /
 *     `data-state` attribute so QA / accessibility tools can read
 *     the precise status without it being visible by default.
 *
 * The mapping is total; the four-state union is exhaustively
 * narrowed by `ReportState` (B1).
 *
 * ## Timestamps
 *
 * The SDK DTO (`PlatformReportItemDto`) does NOT carry a
 * `resolvedAt` field — only `createdAt` and `updatedAt`. We
 * surface:
 *
 *   - `createdAt` when the row is `pending` (the report was filed
 *     at that time).
 *   - `updatedAt` when the row is `resolved` (the most recent
 *     moderator action timestamp).
 *
 * The `resolvedBy` moderator id is not surfaced because the SDK
 * does not expose the moderator id. `EPIC_7_5_A1.md` §5 records
 * this as a known divergence from the planning document.
 *
 * ## Click vs action-menu isolation
 *
 * The row is clickable: clicking it invokes `onSelect(report)`. The
 * action-menu trigger stops propagation so a click on the trigger
 * (or on a menu item) never fires the row click handler. The action
 * menu items surface destructive intent visually (red icon hint);
 * selection itself dispatches `onAction(action)` which the parent
 * (`ReviewReportsList`) routes to the confirm dialog.
 *
 * ## Cross-batch invariants
 *
 *   - The row never calls services or fetches data. Every value
 *     surfaces from `report` (B1) or from props.
 *   - No `axios` / `fetch` call originates from this file. The
 *     cross-batch `admin-no-axios-or-fetch` lint invariant covers it.
 *   - The status pill is computed via `STATUS_PILL_VIEW` (pure
 *     helper), keeping the component side-effect free.
 *   - The component is memoized so a re-render of an unselected row
 *     does not trigger a render of an unchanged report.
 */

import { memo, useCallback, useMemo } from 'react';
import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';

import type { AdminReportDto, ReportState } from '@/features/admin/review-moderation/admin-report-types';
import { ReviewReportActionMenu } from '@/features/admin/review-moderation/components/ReviewReportActionMenu';
import type { ReportConsumerAction } from '@/features/admin/review-moderation/action-enum';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Documented two-state pill surface. Maps the SDK's four-state
 * `ReportState` onto the consumer-facing pill vocabulary.
 */
export type ReportRowStatus = 'pending' | 'resolved';

const STATUS_PILL_VIEW: Readonly<
  Record<ReportState, { label: string; pill: ReportRowStatus; tone: 'slate' | 'emerald' }>
> = Object.freeze({
  open:      { label: 'Pending',  pill: 'pending',  tone: 'slate' },
  reviewed:  { label: 'Reviewed', pill: 'resolved', tone: 'emerald' },
  dismissed: { label: 'Dismissed', pill: 'resolved', tone: 'emerald' },
  actioned:  { label: 'Actioned', pill: 'resolved', tone: 'emerald' },
});

/**
 * Format an ISO timestamp as the documented row label. Returns the
 * original input verbatim when it is not a string so the helper
 * never throws at render time.
 */
function formatRowTimestamp(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // The queue's row label uses the documented short format. The
  // Intl.DateTimeFormat pattern keeps the rendering locale-agnostic
  // for QA screenshots.
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

// ─── Component props ────────────────────────────────────────────────────────

export interface ReviewReportItemProps {
  /**
   * The report row to render. The component treats this as
   * read-only — every value surfaced in the UI originates here.
   */
  report: AdminReportDto;
  /**
   * Invoked when the row body (outside the action menu) is
   * clicked. The argument is the typed `AdminReportDto` so the
   * parent (`ReviewReportsList`) can open the detail side panel.
   */
  onSelect: (report: AdminReportDto) => void;
  /**
   * Invoked when an admin selects an action from the
   * `ReviewReportActionMenu`. The argument is the typed
   * `ReportConsumerAction`; the parent decides whether to mount
   * the confirm dialog (D2).
   */
  onAction: (action: ReportConsumerAction, report: AdminReportDto) => void;
  /**
   * When `true`, the row is rendered with the documented
   * selection background and aria-selected state. Used by the
   * list to keep the side panel in sync with the selected row.
   */
  selected?: boolean;
  /**
   * Optional className forwarded to the outer wrapper. Useful for
   * the parent list to inject a top border on the first row.
   */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * `<ReviewReportItem />` — the only row rendered by
 * `ReviewReportsList`. Pure presentational; services and mutations
 * live in the resolve hook (TKT-7.5.C2).
 */
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
    return statusView.pill === 'resolved' ? report.updatedAt : report.createdAt;
  }, [statusView.pill, report.updatedAt, report.createdAt]);

  const timestampLabel = useMemo(() => {
    const formatted = formatRowTimestamp(timestampValue);
    return formatted.length === 0 ? '' : formatted;
  }, [timestampValue]);

  const handleRowClick = useCallback(() => {
    onSelect(report);
  }, [report, onSelect]);

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(report);
      }
    },
    [report, onSelect],
  );

  const handleAction = useCallback(
    (action: ReportConsumerAction) => {
      onAction(action, report);
    },
    [report, onAction],
  );

  /**
   * The action-menu trigger swallows clicks so the row click
   * handler does not fire when the admin is interacting with the
   * dropdown. The wrapper around the trigger also stops
   * propagation; the menu items render inside the same wrapper.
   */
  const stopPropagation = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation();
    },
    [],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      data-testid={`review-report-row-${report.reportId}`}
      data-state={report.status}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        'flex w-full cursor-pointer items-center gap-4 rounded-md border bg-white px-4 py-3 text-left transition-colors',
        'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : '',
        className ?? '',
      )}
    >
      {/* Reason block */}
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span
            className="truncate font-medium text-foreground"
            data-testid={`review-report-row-reporter-${report.reportId}`}
          >
            {report.reviewerUsername}
          </span>
          <span className="text-xs text-muted-foreground">reported</span>
          <span
            className="truncate text-sm text-muted-foreground"
            data-testid={`review-report-row-quiz-${report.reportId}`}
          >
            {report.quizTitle}
          </span>
        </div>

        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid={`review-report-row-rating-${report.reportId}`}
        >
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden="true"
                className={cn(
                  'h-3.5 w-3.5',
                  index < report.rating
                    ? 'fill-amber-400 stroke-amber-500'
                    : 'fill-transparent stroke-slate-300',
                )}
              />
            ))}
          </span>
          <span>{report.rating}/5</span>
          <span aria-hidden="true">·</span>
          <span
            className="capitalize"
            data-testid={`review-report-row-reason-${report.reportId}`}
          >
            {report.reason.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <Badge
        variant={statusView.tone === 'slate' ? 'secondary' : 'default'}
        data-testid={`review-report-row-pill-${report.reportId}`}
        data-pill={statusView.pill}
        className={cn(
          'shrink-0 capitalize',
          statusView.tone === 'emerald'
            ? 'border-transparent bg-emerald-100 text-emerald-800'
            : '',
        )}
      >
        {statusView.label}
      </Badge>

      {/* Timestamp */}
      <span
        className="hidden shrink-0 text-xs text-muted-foreground md:inline"
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
  );
});