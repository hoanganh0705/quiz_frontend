import { Button } from '@/components/ui/Button'
import QuizCard from '@/features/quizzes/components/QuizCard'
import Link from 'next/link'
import FeaturedQuiz from '@/features/quizzes/components/FeaturedQuiz'
import LiveWinners from '@/features/leaderboard/components/LiveWinner'
import { HowItWorks, SuccessStoriesCarousel } from '@/features/marketing'
import PlayerRanking from '@/features/leaderboard/components/PlayerRanking'
import QuizCardDifficultyList from '@/features/quizzes/components/QuizCardDifficultyList'
import RecentlyPlayedSection from '@/features/users/components/RecentlyPlayedSection'
import { listCategories } from '@/features/categories/api'
import { listQuizzes } from '@/features/quizzes/api'
import type { Category } from '@/features/categories/types'
import type { QuizResponseDto } from '@/lib/api/generated/schemas'
import QuizCategoriesClient from './QuizCategoriesClient'
import { HomeHeroSection } from './HomeHeroSection'

export default async function QuizHubDashboard() {
  let categories: Category[] = []
  let recentQuizzes: QuizResponseDto[] = []

  try {
    const [categoriesData, quizzesData] = await Promise.all([
      listCategories({ limit: 20 }),
      listQuizzes({ limit: 8 }),
    ])
    categories = categoriesData.items
    recentQuizzes = quizzesData.items
  } catch {
    // Fall back to empty array — don't break the page
  }

  return (
    <div className='min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full'>
      <HomeHeroSection />

      <QuizCategoriesClient categories={categories} />

      <div className='bg-main text-foreground border rounded-xl lg:p-8 mb-10 max-w-full overflow-x-hidden'>
        <h2 className='text-2xl font-bold mb-8'>Latest Quizzes</h2>
        <div className='overflow-x-auto'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0'>
            {recentQuizzes.map((quiz) => (
              <div key={quiz.quizId} className='min-w-0 max-w-full'>
                <QuizCard
                  id={quiz.quizId}
                  title={quiz.title}
                  image={quiz.imageUrl ?? '/placeholder.webp'}
                  difficulty={quiz.difficulty}
                />
              </div>
            ))}
          </div>
        </div>

        <div className='flex justify-center mt-3 lg:mt-8 mb-3'>
          <Link href='/quizzes'>
            <Button className='text-sm hover:bg-brand-hover rounded-sm text-white'>
              View All Quizzes
            </Button>
          </Link>
        </div>
      </div>

      <FeaturedQuiz />

      <RecentlyPlayedSection />

      <PlayerRanking />

      <QuizCardDifficultyList />

      <LiveWinners />

      <HowItWorks />

      <SuccessStoriesCarousel />
    </div>
  )
}
