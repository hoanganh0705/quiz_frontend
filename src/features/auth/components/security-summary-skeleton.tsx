'use client';

/**
 * `SecuritySummarySkeleton` — stable loading footprint for the
 * security summary card.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T11.
 *
 * ## Why this exists
 *
 * The dashboard and session-list sections load *independently*
 * (US-2.8.1: "Dashboard summary and session list load
 * independently"). A route-level `loading.tsx` covers both
 * simultaneously — that defeats the contract.
 *
 * This skeleton is mounted INSIDE `<SecuritySummaryCard />`
 * during its `'loading'` status so the dashboard can stream
 * while the session-list is still pending (or vice versa).
 *
 * ## Footprint discipline
 *
 * The skeleton mirrors the populated card's grid layout
 * (2-column `dl`, `gap-x-8 gap-y-5`) so swapping the skeleton
 * for the populated card does not shift the page. Label rows
 * reserve `text-sm` of vertical space; value rows reserve
 * `text-base font-medium` of vertical space; the height between
 * the two is the only constant that can drift — the populated
 * `<dd>` content is always shorter than the skeleton row's
 * `h-5` block because the label row's `mb-1` + label height
 * already equals that of the skeleton.
 *
 * ## Accessibility
 *
 * Skeletons are decorative — the screen-reader user should hear
 * the card's label/title text and skip the placeholder rows.
 * `aria-hidden` on the grid + `aria-busy` on the outer wrapper
 * is the dual-channel contract: the card is "loading", but the
 * placeholder bars are not announced as content.
 */

import { Skeleton } from '@/components/ui/Skeleton';

const SKELETON_GRID_CLASSES =
  'grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5';

export function SecuritySummarySkeleton() {
  return (
    <div
      aria-hidden='true'
      aria-busy='true'
      className={SKELETON_GRID_CLASSES}
      data-testid='security-summary-skeleton'
    >
      {/* Field 1 — Email verification */}
      <div>
        <Skeleton className='h-4 w-32 mb-1' />
        <Skeleton className='h-5 w-20' />
      </div>

      {/* Field 2 — Active session count */}
      <div>
        <Skeleton className='h-4 w-32 mb-1' />
        <Skeleton className='h-5 w-16' />
      </div>

      {/* Field 3 — Last sign-in */}
      <div>
        <Skeleton className='h-4 w-40 mb-1' />
        <Skeleton className='h-5 w-44' />
      </div>

      {/* Field 4 — Password age */}
      <div>
        <Skeleton className='h-4 w-28 mb-1' />
        <Skeleton className='h-5 w-20' />
      </div>
    </div>
  );
}
