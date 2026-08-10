'use client';

/**
 * `features/admin/comment-moderation/components/CommentReportItem.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.E1.
 *
 * ## What this component renders
 *
 * A single row in the comment-moderation queue. The row carries:
 *
 *   - the reporter id (the SDK's `ReportDto` does not carry a
 *     `reporterUsername`; the id is surfaced verbatim),
 *   - the report reason (truncated with a "show more" affordance when
 *     the text is long enough to warrant expansion),
 *   - the offending comment id (the SDK DTO does NOT embed a comment
 *     body or snapshot — the `report.commentId` is surfaced instead
 *     so the detail panel can mount `useComment` for the live read;
 *     see `EPIC_7_6_A1.md` §5),
 *   - the status pill (`pending` / `resolved` — see "Status pill"
 *     below),
 *   - the row-level timestamp (`createdAt` when pending, `updatedAt`
 *     when resolved),
 *   - the `CommentReportActionMenu` (the D1 consumer).
 *
 * ## Status pill
 *
 * The pill maps the SDK's four-state `ReportDtoStatus` (`open`,
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
 * narrowed by `CommentReportState` (B1).
 *
 * ## Timestamps
 *
 * The SDK DTO (`ReportDto`) does NOT carry a `resolvedAt` field —
 * only `createdAt` and `updatedAt`. We surface:
 *
 *   - `createdAt` when the row is `pending` (the report was filed
 *     at that time).
 *   - `updatedAt` when the row is `resolved` (the most recent
 *     moderator action timestamp).
 *
 * The `reviewedAt` timestamp on the DTO is the dedicated resolution
 * timestamp and is surfaced in the detail panel (E2) only when
 * present. The row's timestamp uses `updatedAt` for parity with
 * Epic 7.5's `ReviewReportItem` and because `reviewedAt` can be
 * `null` for reports that have been `dismissed` without a review.
 *
 * ## Click vs action-menu isolation
 *
 * The row is clickable: clicking it invokes `onSelect(report)`. The
 * action-menu trigger stops propagation so a click on the trigger
 * (or on a menu item) never fires the row click handler. The action
 * menu items surface destructive intent visually (red icon hint);
 * selection itself dispatches `onAction(action)` which the parent
 * (`CommentReportsList`) routes to the confirm dialog.
 *
 * ## "Show more" affordance
 *
 * The reason string is rendered in full when short enough to fit
 * on one row. When the row would exceed the documented height
 * budget (the `REASON_PREVIEW_LINE_COUNT`), the row renders a
 * "Show more" toggle that expands the reason block. The toggle
 * resets when the row is unmounted.
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
 *   - The component never reads the comment body (the SDK does not
 *     surface it). The detail panel owns the live-comment read.
 */

import { memo, useCallback, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/shared/utils/merge-class-names';

import type {
  CommentReportDto,
  CommentReportState,
} from '@/features/admin/comment-moderation/admin-comment-report-types';
import { CommentReportActionMenu } from '@/features/admin/comment-moderation/components/CommentReportActionMenu';
import type { CommentReportConsumerAction } from '@/features/admin/comment-moderation/action-enum';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Documented two-state pill surface. Maps the SDK's four-state
 * `CommentReportState` onto the consumer-facing pill vocabulary.
 */
export type CommentRowStatus = 'pending' | 'resolved';

const STATUS_PILL_VIEW: Readonly<
  Record<CommentReportState, { label: string; pill: CommentRowStatus; tone: 'slate' | 'emerald' }>
> = Object.freeze({
  open:      { label: 'Pending',  pill: 'pending',  tone: 'slate' },
  reviewed:  { label: 'Reviewed', pill: 'resolved', tone: 'emerald' },
  dismissed: { label: 'Dismissed', pill: 'resolved', tone: 'emerald' },
  actioned:  { label: 'Actioned', pill: 'resolved', tone: 'emerald' },
});

/**
 * Reason preview line budget. Strings shorter than this render in
 * full without a "show more" affordance.
 */
const REASON_PREVIEW_LINE_COUNT = 1;

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

export interface CommentReportItemProps {
  /**
   * The report row to render. The component treats this as
   * read-only — every value surfaced in the UI originates here.
   */
  report: CommentReportDto;
  /**
   * The author id of the comment being moderated. The parent
   * (`CommentReportsList`) supplies this from `useComment` so the
   * self-moderation gate can run without forcing the row to fetch
   * the comment itself. `null` means "unknown" — the menu treats
   * that as "not a self-moderation attempt" (the documented
   * conservative behaviour).
   */
  commentAuthorId: string | null;
  /**
   * Invoked when the row body (outside the action menu) is
   * clicked. The argument is the typed `CommentReportDto` so the
   * parent (`CommentReportsList`) can open the detail side panel.
   */
  onSelect: (report: CommentReportDto) => void;
  /**
   * Invoked when an admin selects an action from the
   * `CommentReportActionMenu`. The argument is the typed
   * `CommentReportConsumerAction`; the parent decides whether to
   * mount the confirm dialog (D2).
   */
  onAction: (action: CommentReportConsumerAction, report: CommentReportDto) => void;
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
 * `<CommentReportItem />` — the only row rendered by
 * `CommentReportsList`. Pure presentational; services and mutations
 * live in the resolve hook (TKT-7.6.C2).
 */
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
    return statusView.pill === 'resolved' ? report.updatedAt : report.createdAt;
  }, [statusView.pill, report.updatedAt, report.createdAt]);

  const timestampLabel = useMemo(() => {
    const formatted = formatRowTimestamp(timestampValue);
    return formatted.length === 0 ? '' : formatted;
  }, [timestampValue]);

  const reasonText = typeof report.reason === 'string' ? report.reason : '';
  const isLongReason = reasonText.length > 40;

  const [reasonExpanded, setReasonExpanded] = useState(false);

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
    (action: CommentReportConsumerAction) => {
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

  const handleReasonToggle = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation();
      setReasonExpanded((current) => !current);
    },
    [],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      data-testid={`comment-report-row-${report.reportId}`}
      data-state={report.status}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        'flex w-full cursor-pointer items-center gap-4 rounded-md border border-border bg-background px-4 py-3 text-left transition-colors',
        'border-border hover:border-input hover:bg-muted',
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
            data-testid={`comment-report-row-reporter-${report.reportId}`}
          >
            Reporter {report.reporterId}
          </span>
          <span className="text-xs text-muted-foreground">reported</span>
          <span
            className="truncate font-mono text-sm text-muted-foreground"
            data-testid={`comment-report-row-comment-${report.reportId}`}
          >
            {report.commentId}
          </span>
        </div>

        <div
          className={cn(
            'text-sm text-muted-foreground',
            !reasonExpanded && isLongReason
              ? `line-clamp-${REASON_PREVIEW_LINE_COUNT}`
              : '',
          )}
          data-testid={`comment-report-row-reason-${report.reportId}`}
        >
          <span className="capitalize">{reasonText.replace(/_/g, ' ')}</span>
        </div>

        {isLongReason ? (
          <button
            type="button"
            onClick={handleReasonToggle}
            className="self-start text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid={`comment-report-row-reason-toggle-${report.reportId}`}
            aria-expanded={reasonExpanded}
          >
            {reasonExpanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}
      </div>

      {/* Status pill */}
      <Badge
        variant={statusView.tone === 'slate' ? 'secondary' : 'default'}
        data-testid={`comment-report-row-pill-${report.reportId}`}
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
        data-testid={`comment-report-row-timestamp-${report.reportId}`}
      >
        {timestampLabel}
      </span>

      {/* Action menu (click-isolated) */}
      <div
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
        data-testid={`comment-report-row-actions-${report.reportId}`}
      >
        <CommentReportActionMenu
          report={report}
          commentAuthorId={commentAuthorId}
          onAction={handleAction}
        />
      </div>
    </div>
  );
});