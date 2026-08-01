'use client'

/**
 * `<HomePage />` — the home page's main composition.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.D1.
 *
 * The component renders (in order):
 *
 *   1. `<HomeHeroSection />` (preserved — the static hero at the top).
 *   2. `<HomeFeaturedRail />` (C2 — grid, no filter, editorial set).
 *   3. `<HomeTrendingRail />` (C3 — scroller + category filter).
 *   4. `<HomePopularRail />` (C4 — scroller + category filter).
 *   5. `<QuizCategoriesClient />` (preserved — moved BELOW the rails
 *      so the rails surface first per the Story 3.7 line 744 user
 *      flow: "User opens `/`. Page renders the hero, then three rails
 *      stacked vertically...").
 *   6. The preserved-below sections, in their legacy order:
 *      - `<RecentlyPlayedSection />`
 *      - `<PlayerRanking />`
 *      - `<QuizCardDifficultyList />`
 *      - `<LiveWinners />`
 *      - `<HowItWorks />`
 *      - `<SuccessStoriesCarousel />`
 *
 * The component is `'use client'` because two preserved-below
 * sections (`HomeHeroSection`, `RecentlyPlayedSection`,
 * `PlayerRanking`, `LiveWinners`, `QuizCategoriesClient`,
 * `QuizCardDifficultyList`) already declare `'use client'` AND the
 * three rails fetch their data in hooks on the client. The
 * `loading.tsx` skeleton (D3) is server-rendered.
 */

import { HomeHeroSection } from '@/app/(public)/HomeHeroSection'
import QuizCategoriesClient from '@/app/(public)/QuizCategoriesClient'
import RecentlyPlayedSection from '@/features/users/components/RecentlyPlayedSection'
import LiveWinners from '@/features/leaderboard/components/LiveWinner'
import PlayerRanking from '@/features/leaderboard/components/PlayerRanking'
import QuizCardDifficultyList from '@/features/quizzes/components/QuizCardDifficultyList'
import {
  HowItWorks,
  SuccessStoriesCarousel,
} from '@/features/marketing'
import type { Category } from '@/features/categories/types'

import { HomeFeaturedRail } from './HomeFeaturedRail'
import { HomeTrendingRail } from './HomeTrendingRail'
import { HomePopularRail } from './HomePopularRail'

export interface HomePageProps {
  /**
   * Categories fetched server-side by the route file. The route
   * passes the categories to `<QuizCategoriesClient />`; the new
   * `<HomePage />` component does NOT re-fetch them (the categories
   * block is a server-component consumer).
   */
  categories: Category[]
}

export function HomePage({ categories }: HomePageProps): React.ReactElement {
  return (
    <div className='min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full'>
      <HomeHeroSection />

      <div className='flex flex-col gap-8 mb-10'>
        <HomeFeaturedRail />
        <HomeTrendingRail />
        <HomePopularRail />
      </div>

      <QuizCategoriesClient categories={categories} />

      <RecentlyPlayedSection />
      <PlayerRanking />
      <QuizCardDifficultyList />
      <LiveWinners />
      <HowItWorks />
      <SuccessStoriesCarousel />
    </div>
  )
}
