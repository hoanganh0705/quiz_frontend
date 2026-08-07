'use client';

/**
 * `ReviewReportEmptyState` — empty state for the review-moderation
 * queue.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D3.
 *
 * Two empty modes share this component:
 *
 *   - `filter: 'pending'` and the list is empty → "no pending
 *     reports" copy. An optional `onShowResolved` CTA surfaces a
 *     quick path to the resolved tab.
 *   - `filter: 'resolved'` and the list is empty → "no resolved
 *     reports" copy. No CTA — the admin explicitly chose the
 *     resolved filter.
 *
 * The component is purely presentational: it never fetches data,
 * never imports a service, and only renders text + the optional
 * CTA. The `onShowResolved` callback is optional; when omitted the
 * CTA does not render.
 *
 * Cross-batch invariants:
 *   - The component never imports a service.
 *   - The `?show=resolved` CTA is offered only when the queue is
 *     in the `pending` filter mode AND `onShowResolved` is
 *     supplied. The pending mode is the queue's default; admins
 *     who land on an empty pending queue benefit from a direct
 *     path to the resolved bucket.
 */

import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ReviewReportEmptyStateProps {
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

// ─── Copy ───────────────────────────────────────────────────────────────────

const COPY: Readonly<
  Record<
    'pending' | 'resolved',
    { title: string; description: string }
  >
> = Object.freeze({
  pending: {
    title: 'No pending reports',
    description:
      'No reports are awaiting moderation right now. New reports will appear here as they are filed.',
  },
  resolved: {
    title: 'No resolved reports',
    description:
      'No reports match the resolved filter. Try the pending tab to see what is awaiting moderation.',
  },
});

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewReportEmptyState({
  filter,
  onShowResolved,
  className,
}: ReviewReportEmptyStateProps): React.ReactElement {
  const copy = COPY[filter];
  const showCta = filter === 'pending' && typeof onShowResolved === 'function';

  return (
    <div
      data-testid={`review-report-empty-state-${filter}`}
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
