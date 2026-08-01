/**
 * `/quizzes` initial-load skeleton.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.E2.
 *
 * Next.js App-Router `loading.tsx` — rendered automatically while the
 * `<QuizzesDirectoryPage />` (a client component) is loading its
 * initial data. The skeleton matches the live directory's outer
 * dimensions so hydration lands without a CLS shift (Story 3.5 AC #4).
 *
 * Layout parity (vs. `QuizzesDirectoryPage.tsx`):
 *
 *   - `min-h-screen text-foreground p-4 md:p-8 lg:p-12` outer page.
 *   - Header (h-9 title + description line).
 *   - Filter bar (4 affordances in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
 *   - Popular strip (section mb-8 + 5 horizontal cards).
 *   - Trending strip (section mb-8 + 5 horizontal cards).
 *   - Directory grid (20 `<QuizCardSkeleton />` in
 *     `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
 *
 * The skeleton uses the Story 3.1 `<QuizCardSkeleton />` primitive
 * (`@/components/primitives`) so the dimensions match the live
 * `<QuizCard />` exactly — no CLS on hydration.
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { QuizCardSkeleton } from '@/components/primitives'

const SKELETON_COUNT = 20
const STRIP_SKELETON_COUNT = 5

export default function QuizzesLoading() {
  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      data-testid='quizzes-loading'
    >
      {/* Header — matches the live page header. */}
      <header className='mb-8'>
        <Skeleton className='h-9 w-48 mb-2' />
        <Skeleton className='h-5 w-96' />
      </header>

      {/* Filter bar skeleton — 4 affordances (category / sort /
          difficulty / tags) in the same grid layout as the live
          `<FilterBar />`. */}
      <section
        className='mb-6 rounded-lg border border-border bg-card p-4'
        aria-label='Loading quiz filters'
      >
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-9 w-full rounded-md' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-9 w-full rounded-md' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-4 w-20' />
            <div className='mt-2 flex flex-col gap-3'>
              <div className='flex items-center gap-2'>
                <Skeleton className='size-4 rounded-full' />
                <Skeleton className='h-4 w-20' />
              </div>
              <div className='flex items-center gap-2'>
                <Skeleton className='size-4 rounded-full' />
                <Skeleton className='h-4 w-12' />
              </div>
              <div className='flex items-center gap-2'>
                <Skeleton className='size-4 rounded-full' />
                <Skeleton className='h-4 w-16' />
              </div>
              <div className='flex items-center gap-2'>
                <Skeleton className='size-4 rounded-full' />
                <Skeleton className='h-4 w-12' />
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1'>
            <Skeleton className='h-4 w-12' />
            <div className='flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-5 w-16 rounded-full' />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular strip — 5 horizontal card skeletons. */}
      <section className='mb-8' aria-label='Loading popular quizzes'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <Skeleton className='h-4 w-28' />
        </div>
        <div className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory'>
          {Array.from({ length: STRIP_SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className='w-64 shrink-0 snap-start rounded-xl border bg-card p-4'
            >
              <Skeleton className='h-4 w-3/4 mb-2' />
              <Skeleton className='h-3 w-1/2' />
            </div>
          ))}
        </div>
      </section>

      {/* Trending strip — 5 horizontal card skeletons. */}
      <section className='mb-8' aria-label='Loading trending quizzes'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <Skeleton className='h-4 w-28' />
        </div>
        <div className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory'>
          {Array.from({ length: STRIP_SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className='w-64 shrink-0 snap-start rounded-xl border bg-card p-4'
            >
              <Skeleton className='h-4 w-3/4 mb-2' />
              <Skeleton className='h-3 w-1/2' />
            </div>
          ))}
        </div>
      </section>

      {/* Directory grid — 20 `<QuizCardSkeleton />` in the same
          grid layout as the live `<QuizCard />`. */}
      <section aria-label='Loading quizzes directory'>
        <div
          className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          aria-busy='true'
          data-testid='quizzes-loading-grid'
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
