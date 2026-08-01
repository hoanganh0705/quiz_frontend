/**
 * `/tags/[slug]` route loading surface.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.E5.
 *
 * The shape mirrors the live detail page (`<TagDetailPage />`):
 * the breadcrumb + header skeleton + analytics panel skeleton +
 * quiz grid skeleton + related strip skeleton.
 *
 * CLS = 0 once the live page hydrates: every skeleton's outer
 * dimensions match the live component's outer dimensions.
 *
 * The component is a server component (no `'use client'`) — Next.js
 * App-Router renders this automatically during the initial navigation
 * + server-side data fetch (the SWR hooks fire after hydration).
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { TagPillSkeleton, QuizCardGrid } from '@/components/primitives'

const BREADCRUMB_HEIGHT = 'h-4 w-32'
const HEADER_TITLE_HEIGHT = 'h-7 w-48'
const HEADER_SLUG_HEIGHT = 'h-4 w-32'
const STRIP_CONTAINER = 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory'
const GRID_PADDING = 'mt-12'

export default function TagDetailLoading() {
  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      aria-busy='true'
      aria-label='Loading tag detail page'
      data-testid='tag-detail-loading'
    >
      {/* Breadcrumb skeleton */}
      <nav
        aria-label='Loading breadcrumb'
        className='mb-3 flex items-center gap-1'
      >
        <Skeleton className={BREADCRUMB_HEIGHT} />
      </nav>

      {/* Header skeleton — title + slug + created-at */}
      <header className='mb-8'>
        <div className='flex items-baseline gap-3'>
          <Skeleton className={HEADER_TITLE_HEIGHT} />
          <Skeleton className={HEADER_SLUG_HEIGHT} />
        </div>
        <Skeleton className='mt-2 h-3 w-40' />
      </header>

      {/* Analytics panel skeleton — three count cards + sparkline block. */}
      <div
        className='mb-8'
        aria-label='Loading tag analytics'
        data-testid='tag-detail-analytics-skeleton'
      >
        <Skeleton className='mb-3 h-5 w-24' />
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='rounded-md border bg-card p-4'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='mt-2 h-6 w-32' />
            </div>
          ))}
        </div>
        <Skeleton className={`mt-4 h-20 w-full rounded-md`} />
      </div>

      {/* Quiz grid skeleton — 12 cards (matches <TagQuizGrid />). */}
      <div
        className='mb-8'
        aria-label='Loading quizzes for this tag'
        data-testid='tag-detail-grid-skeleton'
      >
        <QuizCardGrid skeletonCount={12} />
      </div>

      {/* Related strip skeleton — 5 pills, identical dimensions to the live strip. */}
      <section className={GRID_PADDING} aria-label='Loading related tags'>
        <Skeleton className='mb-3 h-4 w-24' />
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <TagPillSkeleton key={`related-${i}`} />
          ))}
        </div>
      </section>
    </div>
  )
}
