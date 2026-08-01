/**
 * `loading.tsx` for the `/` route — the Next.js App-Router loading
 * skeleton that mirrors the `<HomePage />` outer dimensions.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.D3.
 *
 * The skeleton renders (in order):
 *
 *   1. `<HomeHeroSection />` (preserved — the hero ships statically
 *      so its own render path doesn't block on data; we render it
 *      as-is to match the resolved dimensions).
 *   2. A skeleton `<QuizRailSkeleton layout="grid" count={6} />`
 *      for the featured rail.
 *   3. A skeleton `<QuizRailSkeleton layout="scroller" count={10} />`
 *      for the trending rail.
 *   4. A skeleton `<QuizRailSkeleton layout="scroller" count={10} />`
 *      for the popular rail.
 *
 * The skeleton surfaces have identical outer dimensions to the live
 * rails — no CLS on hydration (Story 3.7 AC #3). The page below
 * (categories, recently-played, leaderboard, etc.) is preserved-below
 * and is not part of the route's critical-render surface; the
 * client-side Suspense boundary in the `<HomePage />` composition
 * paints those once the rails resolve.
 */

import { HomeHeroSection } from './HomeHeroSection'

import {
  FEATURED_RAIL_LIMIT,
  TRENDING_RAIL_LIMIT,
  POPULAR_RAIL_LIMIT,
} from '@/features/quizzes/types/home-rails'
import { QuizRailSkeleton } from '@/features/quizzes/components/QuizRailSkeleton'

export default function Loading() {
  return (
    <div
      className='min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full'
      data-testid='home-loading'
      aria-busy='true'
      aria-label='Loading home page'
    >
      <HomeHeroSection />

      <div className='flex flex-col gap-8 mb-10'>
        <QuizRailSkeleton layout='grid' count={FEATURED_RAIL_LIMIT} />
        <QuizRailSkeleton
          layout='scroller'
          count={TRENDING_RAIL_LIMIT}
        />
        <QuizRailSkeleton
          layout='scroller'
          count={POPULAR_RAIL_LIMIT}
        />
      </div>
    </div>
  )
}
