import { Button } from '@/components/ui/button'
import categories from '@/constants/categories'
import QuizCategories from '@/components/QuizCategories'
import QuizCard from '@/components/QuizCard'
import Link from 'next/link'
import FeaturedQuiz from '@/components/FeaturedQuiz'
import LiveWinners from '@/components/LiveWinner'
import HowItWorks from '@/components/HowItWorks'
import SuccessStoriesCarousel from '@/components/SuccessStoryCarousel'
import PlayerRanking from '@/components/homepage/PlayerRanking'
import QuizCardDifficultyList from '@/components/homepage/QuizCardDifficultyList'
import { quizzes } from '@/constants/mockQuizzes'

export default function QuizHubDashboard() {
  return (
    <div className='min-h-screen p-4 md:p-6 overflow-x-hidden max-w-full'>
      <div className='relative bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 sm:p-8 lg:p-12 mb-6 sm:mb-8 border border-gray-300 dark:border-slate-600'>
        <div className='relative z-10 max-w-full sm:max-w-lg lg:max-w-2xl'>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-slate-900 dark:text-white'>
            Your Quiz Adventure
            <br />
            Starts Here:
            <br />
            <span className='text-default'>Play, Share, Earn!</span>
          </h1>
          <p className='text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 mb-6 sm:mb-8'>
            Build engaging quizzes, challenge others, and earn rewards
            <br className='hidden sm:inline' />
            for your knowledge.
          </p>
          <div className='flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4'>
            <Button
              size='lg'
              className='text-white bg-default hover:bg-default-hover w-full sm:w-auto'
            >
              Create Quiz
            </Button>
            <Button
              size='lg'
              className='text-default bg-white hover:bg-slate-50 border border-default-hover dark:text-default dark:bg-transparent dark:hover:bg-slate-700 dark:border-default-hover w-full sm:w-auto'
            >
              Join Contest
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className='absolute top-4 right-4 bg-default text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full transform rotate-12 text-sm sm:text-base shadow-lg'>
          <span className='font-bold'>Science Quiz</span>
        </div>
        <div className='absolute bottom-6 sm:bottom-8 right-6 sm:right-8 w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 bg-linear-to-br from-blue-400 to-purple-400 rounded-full opacity-15'></div>
        <div className='absolute top-1/2 right-8 sm:right-12 lg:right-16 w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 bg-yellow-300 rounded-full opacity-25'></div>
      </div>

      {/* Quiz Categories */}
      <QuizCategories categories={categories} />

      {/* Latest Quizzes */}
      <div className='bg-main text-foreground border rounded-xl lg:p-8 mb-10 max-w-full overflow-x-hidden'>
        <h2 className='text-2xl font-bold mb-8'>Latest Quizzes</h2>
        <div className='overflow-x-auto'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0'>
            {quizzes.map((quiz) => (
              <div key={quiz.id} className='min-w-0 max-w-full'>
                <QuizCard
                  title={quiz.title}
                  categories={quiz.categories}
                  difficulty={quiz.difficulty}
                  image={quiz.image}
                />
              </div>
            ))}
          </div>
        </div>

        <div className='flex justify-center mt-3 lg:mt-8 mb-3'>
          <Button className='text-sm hover:bg-default-hover rounded-sm text-white'>
            <Link href='/quizzes'>View All Quizzes</Link>
          </Button>
        </div>
      </div>

      {/* Featured Quiz */}
      <FeaturedQuiz />

      {/* Player Ranking */}
      <PlayerRanking />

      {/* QuizCard Difficulty*/}
      <QuizCardDifficultyList />

      {/* Live Winners */}
      <LiveWinners />

      {/*How it Works */}
      <HowItWorks />

      {/* Success Story */}
      <SuccessStoriesCarousel />
    </div>
  )
}
