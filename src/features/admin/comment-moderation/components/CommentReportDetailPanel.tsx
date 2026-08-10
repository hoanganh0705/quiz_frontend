'use client';

/**
 * `features/admin/comment-moderation/components/CommentReportDetailPanel.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.E2.
 *
 * ## What this component renders
 *
 * A side panel that surfaces the offending comment alongside the
 * report metadata. The panel is purely presentational: services
 * live in `useComment` (TKT-7.6.C4); the parent `CommentReportsList`
 * mounts / unmounts it.
 *
 * ## Data path (live-fetch only — no snapshot)
 *
 * `EPIC_7_6_A1.md` §5 records that the SDK's `ReportDto` does NOT
 * carry a `commentSnapshot` field (the field is `blocked` pending
 * backend confirmation). Therefore the panel does **not** have a
 * snapshot-first branch — the values that *would* be in the
 * snapshot are not on the DTO, so every read falls through to
 * `useComment(report.commentId)` which fetches the live comment
 * via the Phase 4 read path.
 *
 * When the live read returns a payload the panel renders the
 * comment body, the author display name, the timestamps, and the
 * moderation state (`isHidden`). When the live read returns
 * `COMMENT_NOT_FOUND` the panel surfaces the documented empty
 * state.
 *
 * ## Hidden comment affordance
 *
 * When `comment.isHidden === true` the panel renders
 * `CommentHiddenState` (TKT-7.6.D4) instead of the comment body.
 * The hidden-state component owns the "Restore comment" affordance;
 * the panel wires the click to `onRestore` (a side-channel
 * restore path documented at TKT-7.6.D3 — `RestoreCommentDialog`).
 *
 * ## Scroll preservation across list refetches
 *
 * The list owns the queue's scroll position. The panel preserves
 * its OWN internal scroll position across list refetches by
 * mounting a single scrollable container whose `scrollTop` is
 * captured by the parent's re-validation cycle. The panel does not
 * implement cross-refetch scroll restoration itself; the parent
 * wraps the panel in a `useScrollPreserve` boundary (see
 * `CommentReportsList` E3) so the panel container can be observed.
 *
 * ## Why this is a side panel and not a route
 *
 * The queue is a paginated list with cross-row selection. Routing
 * each row to its own URL (`/admin/comments/reports/:reportId`)
 * would conflict with the list's cursor-pagination URL state and
 * pollute navigation history. The side-panel pattern keeps the
 * selection ephemeral and inside the queue surface.
 *
 * ## Cross-batch invariants
 *
 *   - The panel never imports `comment-moderation.service.ts` or
 *     `comments.service.ts` directly. The data path is
 *     `useComment` → service.
 *   - No `axios` / `fetch` call originates from this file.
 *   - The `onClose` callback is wired to the parent (the list
 *     toggles selection).
 */

import { useCallback, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import type { CommentReportDto } from '@/features/admin/comment-moderation/admin-comment-report-types';
import { useComment } from '@/features/admin/comment-moderation/hooks/useComment';
import { CommentHiddenState } from '@/features/admin/comment-moderation/components/CommentReportStates';
import type { CommentDto } from '@/lib/api/generated/schemas';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

/**
 * Type-narrow the `useComment` payload (typed `unknown | null`) to
 * the SDK's `CommentDto`. The function returns `null` when the
 * payload is missing any documented field; this conservative
 * narrowing keeps the panel safe even if the SDK regenerates with
 * a narrower shape.
 */
function readCommentDto(value: unknown): CommentDto | null {
  if (value === null || typeof value !== 'object') return null;
  const candidate = value as Partial<CommentDto>;
  if (typeof candidate.id !== 'string') return null;
  if (typeof candidate.body !== 'string') return null;
  if (typeof candidate.authorId !== 'string') return null;
  if (typeof candidate.isHidden !== 'boolean') return null;
  return candidate as CommentDto;
}

/**
 * Compute the displayable author label for the rendered comment.
 * The SDK's `AuthorDtoDisplayName` is typed `{ [key: string]: unknown } | null`
 * — a render-side string coercion is the only way to keep it from
 * leaking into JSX. The helper prefers the non-null display name
 * when present, then the username, then the raw author id.
 */
function resolveCommentAuthorDisplay(comment: CommentDto): string {
  const author = comment.author;
  // `displayName` and `username` come from the SDK as either
  // `{ [key: string]: unknown }` or `string`. A two-step cast
  // through `unknown` lets us narrow to `string | null` so
  // `typeof === 'string'` is a real type guard.
  const rawDisplayName = author?.displayName as unknown as string | null;
  if (typeof rawDisplayName === 'string' && rawDisplayName.length > 0) {
    return rawDisplayName;
  }
  const rawUsername = author?.username as unknown as string | null;
  if (typeof rawUsername === 'string' && rawUsername.length > 0) {
    return rawUsername;
  }
  return comment.authorId;
}

// ─── Component props ────────────────────────────────────────────────────────

export interface CommentReportDetailPanelProps {
  /**
   * The report row the panel surfaces. `null` is not a valid
   * state — the parent only mounts the panel with a row.
   */
  report: CommentReportDto;
  /** Close the panel (the parent toggles selection). */
  onClose: () => void;
  /**
   * Triggered when the admin clicks "Restore" on the
   * `CommentHiddenState`. The parent wires this to
   * `RestoreCommentDialog` (D3); the panel does not run the
   * mutation.
   */
  onRestore: (commentId: string) => void;
  /**
   * Optional className forwarded to the outer wrapper. Useful
   * for the parent list to align the panel inside a flex layout.
   */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommentReportDetailPanel({
  report,
  onClose,
  onRestore,
  className,
}: CommentReportDetailPanelProps): React.ReactElement {
  /**
   * Live-fetch the offending comment. The SDK's `ReportDto` does
   * not embed a snapshot (per A1 §5), so every render path goes
   * through `useComment`. The hook returns `comment: null` while
   * the first fetch is in flight.
   */
  const { comment, isLoading: isCommentLoading, outcome: commentOutcome } =
    useComment({ commentId: report.commentId });

  const commentDto = readCommentDto(comment);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * Capture the panel's scroll position before unmount so the
   * parent can restore it after a list refetch. The parent reads
   * the captured value via the data attribute.
   */
  const captureScroll = useCallback(() => {
    const node = scrollRef.current;
    if (node === null) return;
    node.setAttribute('data-scroll-top', String(node.scrollTop));
  }, []);

  /**
   * Restore the captured scroll position on mount (and on every
   * refetch via the effect dep). The parent re-mounts the panel
   * when its key changes (the report id), so the effect fires on
   * each selection.
   */
  useEffect(() => {
    const node = scrollRef.current;
    if (node === null) return;
    const captured = node.getAttribute('data-scroll-top');
    if (typeof captured === 'string' && captured.length > 0) {
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
      if (event.key === 'Escape') {
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
        'flex h-full w-full flex-col gap-4 overflow-hidden rounded-lg border border-border bg-background',
        className ?? '',
      )}
    >
      <header
        className="flex items-start justify-between gap-2 border-b border-border px-5 py-3"
        data-testid={`comment-report-detail-header-${report.reportId}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">
            Offending comment
          </h2>
          <p className="text-xs text-muted-foreground">
            Report <span className="font-mono">{report.reportId}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close detail panel"
          onClick={handleClose}
          data-testid={`comment-report-detail-close-${report.reportId}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        data-testid={`comment-report-detail-scroll-${report.reportId}`}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5"
      >
        {/* Snapshot block — surfaces the report metadata and the
            reporter / reported-at fields that the DTO carries. */}
        <section
          className="rounded-md border border-border bg-muted/40 px-4 py-3"
          data-testid={`comment-report-detail-snapshot-${report.reportId}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Report metadata
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Reported by{' '}
            <span className="font-mono font-medium text-foreground">
              {report.reporterId}
            </span>
            {' '}on{' '}
            <span className="font-medium text-foreground">
              {formatTimestamp(report.createdAt)}
            </span>
          </p>

          <p className="mt-2 text-xs text-slate-700">
            Reason:{' '}
            <span className="font-medium capitalize">
              {report.reason.replace(/_/g, ' ')}
            </span>
          </p>
          {report.details !== null && report.details !== undefined && report.details.length > 0 ? (
            <p className="mt-1 text-xs text-slate-700">{report.details}</p>
          ) : null}
        </section>

        {/* Live-fetch block — comment body, hidden state, or empty
            state. Rendered as a `CommentHiddenState` when the
            offending comment is hidden, so the restore affordance
            lights up. */}
        {isHidden && commentDto !== null ? (
          <CommentHiddenState
            commentId={commentDto.id}
            onRestore={handleRestore}
          />
        ) : (
          <section
            className="rounded-md border border-border px-4 py-3"
            data-testid={`comment-report-detail-live-${report.reportId}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Live comment
              </p>
              <Badge variant="outline" className="text-[10px]">
                Live at fetch time
              </Badge>
            </div>

            {isCommentLoading ? (
              <p
                className="mt-2 text-xs text-muted-foreground"
                data-testid={`comment-report-detail-live-loading-${report.reportId}`}
              >
                Loading live comment…
              </p>
            ) : commentDto !== null ? (
              <div className="mt-2 flex flex-col gap-1 text-xs text-slate-700">
                <p>
                  Author:{' '}
                  <span className="font-medium">
                    {resolveCommentAuthorDisplay(commentDto)}
                  </span>
                  {commentDto.author?.username !== undefined ? (
                    <span className="text-muted-foreground">
                      {' '}(
                      <span className="font-mono">{commentDto.authorId}</span>
                      )
                    </span>
                  ) : null}
                </p>
                <p>
                  Created:{' '}
                  <span className="font-medium">
                    {formatTimestamp(commentDto.createdAt)}
                  </span>
                </p>
                {commentDto.updatedAt !== commentDto.createdAt ? (
                  <p>
                    Last updated:{' '}
                    <span className="font-medium">
                      {formatTimestamp(commentDto.updatedAt)}
                    </span>
                  </p>
                ) : null}
                <p
                  className="mt-2 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                  data-testid={`comment-report-detail-live-text-${report.reportId}`}
                >
                  {commentDto.body}
                </p>
              </div>
            ) : (
              <p
                className="mt-2 text-xs text-muted-foreground"
                data-testid={`comment-report-detail-live-empty-${report.reportId}`}
              >
                {commentOutcome === 'not-found'
                  ? 'The offending comment no longer exists. The report metadata above is still authoritative.'
                  : 'The live comment could not be loaded. The report metadata above is still authoritative.'}
              </p>
            )}

            {commentOutcome === 'forbidden' ? (
              <p
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700"
                role="status"
                data-testid={`comment-report-detail-live-error-${report.reportId}`}
              >
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Live comment is unavailable; the report metadata above
                is still authoritative.
              </p>
            ) : null}
          </section>
        )}

        {/* Audit trail block — surfaced when the report is closed. */}
        {report.status !== 'open' ? (
          <section
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900"
            data-testid={`comment-report-detail-resolved-${report.reportId}`}
          >
            <p className="font-semibold">This report is closed.</p>
            {report.updatedAt !== null && report.updatedAt !== undefined ? (
              <p className="mt-1">
                Last updated:{' '}
                <span className="font-medium">
                  {formatTimestamp(report.updatedAt)}
                </span>
              </p>
            ) : null}
            {report.reviewedAt !== null && report.reviewedAt !== undefined ? (
              <p className="mt-1">
                Reviewed at:{' '}
                <span className="font-medium">
                  {formatTimestamp(report.reviewedAt)}
                </span>
              </p>
            ) : null}
            {report.reviewedByUserId !== null && report.reviewedByUserId !== undefined ? (
              <p className="mt-1">
                Reviewed by:{' '}
                <span className="font-mono">{report.reviewedByUserId}</span>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer
        className="flex items-center justify-between gap-2 border-t border-border px-5 py-3"
        data-testid={`comment-report-detail-footer-${report.reportId}`}
      >
        <p className="text-xs text-muted-foreground">
          {report.status === 'open'
            ? 'Awaiting moderation.'
            : 'Closed.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClose}
          data-testid={`comment-report-detail-close-footer-${report.reportId}`}
        >
          Close
        </Button>
      </footer>
    </aside>
  );
}