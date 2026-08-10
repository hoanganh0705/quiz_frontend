'use client';

/**
 * `CommentReportSkeleton` / `CommentReportEmptyState` /
 * `CommentReportErrorState` / `CommentHiddenState` — surface
 * primitives for the comment-moderation queue.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D4.
 *
 * Each primitive is purely presentational: it never fetches data,
 * never imports a service, and never holds mutable state. The
 * `CommentHiddenState` is the single component that renders when
 * an admin opens a comment that is currently hidden — it preserves
 * the documented "hidden" copy and the restore affordance.
 *
 * Cross-batch invariants:
 *
 *   - The skeleton, empty, and error states mirror the review-
 *     moderation equivalents (TKT-7.5.D3/D4) so the layout reads
 *     consistently across the admin shells.
 *   - The `Hidden` state is the only state that exposes the
 *     `onRestore` action — the parent row wires the callback to
 *     `RestoreCommentDialog` (D3).
 *   - The error state surfaces the request id banner when the
 *     error carries a `requestId`. The component NEVER retries the
 *     mutation itself; the parent decides.
 */

import { AlertTriangle, Inbox, EyeOff } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import type { ApiError } from '@/lib/api/core/ApiError';

// ─── Skeleton ───────────────────────────────────────────────────────────────

export interface CommentReportSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 3 (the queue's
   * initial page size for a fresh load). Clamped to `>= 1`.
   */
  rows?: number;
}

export function CommentReportSkeleton({
  rows = 3,
}: CommentReportSkeletonProps): React.ReactElement {
  const count = Math.max(1, Math.floor(rows));

  return (
    <ul
      role="status"
      aria-busy="true"
      aria-label="Loading comment reports"
      className="flex flex-col gap-2"
      data-testid="comment-report-skeleton-list"
    >
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-4 rounded-md border border-border bg-background px-4 py-3"
          data-testid={`comment-report-skeleton-row-${index}`}
        >
          {/* Avatar placeholder */}
          <Skeleton className="h-9 w-9 rounded-full" />

          {/* Reason + status text placeholder */}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* Status pill placeholder */}
          <Skeleton className="h-5 w-20 rounded-full" />

          {/* Action trigger placeholder */}
          <Skeleton className="h-8 w-8 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

export interface CommentReportEmptyStateProps {
  /**
   * The active filter mode. Drives the copy and the optional
   * CTA visibility.
   */
  filter: 'pending' | 'resolved';
  /**
   * When supplied and `filter === 'pending'`, renders a CTA that
   * switches the queue to the resolved filter via the URL search
   * param (`?show=resolved`).
   */
  onShowResolved?: () => void;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

const EMPTY_COPY: Readonly<
  Record<'pending' | 'resolved', { title: string; description: string }>
> = Object.freeze({
  pending: {
    title: 'No pending comment reports',
    description:
      'No comment reports are awaiting moderation right now. New reports will appear here as they are filed.',
  },
  resolved: {
    title: 'No resolved comment reports',
    description:
      'No comment reports match the resolved filter. Try the pending tab to see what is awaiting moderation.',
  },
});

export function CommentReportEmptyState({
  filter,
  onShowResolved,
  className,
}: CommentReportEmptyStateProps): React.ReactElement {
  const copy = EMPTY_COPY[filter];
  const showCta = filter === 'pending' && typeof onShowResolved === 'function';

  return (
    <div
      data-testid={`comment-report-empty-state-${filter}`}
      className={className}
    >
      <EmptyState
        icon={Inbox}
        title={copy.title}
        description={copy.description}
        actions={
          showCta
            ? [
                {
                  label: 'View resolved reports',
                  onClick: onShowResolved as () => void,
                },
              ]
            : undefined
        }
      />
    </div>
  );
}

// ─── ErrorState ─────────────────────────────────────────────────────────────

export interface CommentReportErrorStateProps {
  /** The typed error from the read hook. */
  error: ApiError | null;
  /** Called when the admin clicks "Retry". */
  onRetry?: () => void;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

export function CommentReportErrorState({
  error,
  onRetry,
  className,
}: CommentReportErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      className={className}
      data-testid="comment-report-error-state"
    >
      <EmptyState
        icon={AlertTriangle}
        title="Could not load comment reports"
        description="The comment-reports feed did not respond. Copy the request id and retry, or refresh the page."
        actions={
          typeof onRetry === 'function'
            ? [
                {
                  label: 'Retry',
                  onClick: onRetry,
                },
              ]
            : undefined
        }
      />
      <div className="mx-auto mt-3 max-w-sm">
        <RequestIdBanner error={error} />
      </div>
    </div>
  );
}

// ─── HiddenState ────────────────────────────────────────────────────────────

export interface CommentHiddenStateProps {
  /** The id of the (hidden) comment. Rendered as the title summary. */
  commentId: string;
  /**
   * Called when the admin clicks "Restore". The parent wires this to
   * `RestoreCommentDialog` (D3); the component itself does not run
   * the mutation.
   */
  onRestore: () => void;
  /** Optional className forwarded to the outer wrapper. */
  className?: string;
}

/**
 * Renders when an admin opens a comment that is currently hidden.
 * The component is purely presentational: it shows the documented
 * "hidden" copy, the comment id, and a "Restore" button that
 * delegates to the parent. The parent is responsible for opening
 * `RestoreCommentDialog` (D3) and running the mutation.
 */
export function CommentHiddenState({
  commentId,
  onRestore,
  className,
}: CommentHiddenStateProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      data-testid={`comment-hidden-state-${commentId}`}
    >
      <EmptyState
        icon={EyeOff}
        title="This comment is hidden"
        description="The comment is not visible to the public. You can restore it from here."
        actions={[
          {
            label: 'Restore comment',
            onClick: onRestore,
          },
        ]}
      />
      <p className="mx-auto mt-2 max-w-sm text-center text-xs text-muted-foreground">
        Comment id: <span className="font-mono">{commentId}</span>
      </p>
    </div>
  );
}

// ─── Supplementary: SkeletonHeading / EmptyHeading are not part of this
// ─── ticket; the parent list renders its own heading so the primitives
// ─── stay focused on the body of the row.

void Button;
