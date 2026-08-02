/**
 * `loading.tsx` — the route-level skeleton for
 * `/daily-challenge`.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.D1.
 *
 * ## CLS-zero invariant
 *
 * The route-level skeleton's outer dimensions match the live
 * composition (`<DailyChallengePage />` in TKT-3.12.C1) so that the
 * route-skeleton-to-live swap is CLS-zero:
 *
 *   - The outer container uses the same `min-h-screen text-foreground
 *     p-4 md:p-8 lg:p-12` chrome as `app/(public)/daily-challenge/page.tsx`.
 *   - The route-level header skeleton mirrors the `<header>` block
 *     rendered in `page.tsx` (the same two-line header with the same
 *     `space-y-2` gap).
 *   - The live body wrapper uses `mt-6 space-y-6`, matching the
 *     `space-y-6` gap between
 *     `<DailyChallengeCard />` / `<DailyChallengeHistoryList />` in
 *     the live composition.
 *   - The individual `<DailyChallengeCardSkeleton />` and
 *     `<DailyChallengeHistorySkeleton />` components own their own
 *     CLS-zero invariants (TKT-3.12.B3) — they match their respective
 *     live counterparts byte-for-byte for outer width / padding.
 *
 * A future change that drifts the skeleton's outer dimensions will
 * fail the snapshot test in D3.
 *
 * ## Why this is a server component
 *
 * The file is the Next.js App Router `loading.tsx` boundary — it is
 * rendered on the server during the route's data load. The
 * skeleton primitives (`Card`, `Skeleton`) are imported eagerly so
 * the SSR pass produces the same chrome the client would render
 * once SWR resolves.
 */

import { Skeleton } from '@/components/ui/Skeleton'
import {
  DailyChallengeCardSkeleton,
  DailyChallengeHistorySkeleton,
} from '@/features/daily-challenge/components'

export default function DailyChallengeLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header skeleton — mirrors `app/(public)/daily-challenge/page.tsx`'s `<header>`. */}
      <header className='space-y-2' role='banner'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-5 w-96 max-w-full' />
      </header>

      {/* InfoCard skeleton — mirrors the sibling `<InfoCard />` rendered
          in `page.tsx`. Its outer dimensions are identical (the
          `grid-cols-1 lg:grid-cols-4 gap-4 mt-6` block + 4 cols
          of single-row cards). */}
      <section
        className='grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6'
        aria-label='Challenge information loading'
        aria-busy={true}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='border border-border rounded-xl p-4 flex items-center space-x-3'
          >
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-5 w-32' />
            </div>
          </div>
        ))}
      </section>

      {/* Live body skeleton — mirrors `<DailyChallengePage />`'s
          `space-y-6` wrapper. The two skeletons inside own their own
          CLS-zero invariants (TKT-3.12.B3). */}
      <main
        className='mt-6 space-y-6'
        aria-busy={true}
        aria-label='Daily challenge loading'
      >
        <DailyChallengeCardSkeleton />
        <DailyChallengeHistorySkeleton />
      </main>
    </div>
  )
}
