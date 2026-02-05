import { memo } from 'react' // rerender-memo
import { Button } from '@/components/ui/button'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { Trophy, Sparkles, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Hoist static feature card data (rendering-hoist-jsx)
const FEATURE_CARDS = [
  {
    id: 'compete',
    icon: Trophy,
    iconClass: 'text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    title: 'Compete & Win',
    description:
      'Join tournaments, climb the leaderboards, and earn rewards for your knowledge.',
    colSpan: ''
  },
  {
    id: 'learn',
    icon: Sparkles,
    iconClass: 'text-indigo-400',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    title: 'Learn & Grow',
    description:
      'Expand your knowledge across 20+ categories with fun, interactive quizzes.',
    colSpan: ''
  },
  {
    id: 'connect',
    icon: Users,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    title: 'Connect & Share',
    description:
      'Challenge friends, share results, and join a community of quiz enthusiasts.',
    colSpan: 'sm:col-span-2 lg:col-span-1'
  }
] as const

// Extract FeatureCard as memoized component (rerender-memo, patterns-explicit-variants)
const FeatureCard = memo(function FeatureCard({
  icon: Icon,
  iconClass,
  bgClass,
  title,
  description,
  colSpan
}: (typeof FEATURE_CARDS)[number]) {
  return (
    <Card
      className={`bg-main dark:bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:bg-main-hover transition-all duration-300 group cursor-pointer ${colSpan}`}
    >
      <CardContent className='p-6 sm:p-8 text-center'>
        <div
          className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full ${bgClass} mb-3 sm:mb-4`}
          aria-hidden='true'
        >
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass}`} />
        </div>
        <h3 className='text-xl font-bold text-foreground mb-3 sm:mb-4'>
          {title}
        </h3>
        <p className='text-foreground/70 leading-relaxed text-sm sm:text-base'>
          {description}
        </p>
      </CardContent>
    </Card>
  )
})

const TestKnowledge = memo(function TestKnowledge() {
  return (
    <section
      className='bg-linear-to-br bg-default to-indigo-900 rounded-xl px-4 sm:px-6 py-6 sm:py-10 w-full overflow-hidden shadow-lg mt-6 sm:mt-10'
      aria-labelledby='test-knowledge-title'
    >
      {/* Header Badge */}
      <div className='flex justify-center mb-8 sm:mb-12'>
        <div className='inline-flex items-center gap-2 bg-background dark:bg-main border border-purple-500/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 backdrop-blur-sm text-foreground'>
          <Sparkles
            className='w-4 h-4 sm:w-5 sm:h-5 text-purple-400'
            aria-hidden='true'
          />
          <span className='text-foreground text-xs sm:text-sm font-medium'>
            Discover Your Next Challenge
          </span>
        </div>
      </div>

      {/* Main Hero Section */}
      <div className='text-center mb-8 sm:mb-10'>
        <h2
          id='test-knowledge-title'
          className='text-xl sm:text-2xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-linear-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent leading-tight px-2'
        >
          Ready to Test Your Knowledge?
        </h2>
        <p className='text-foreground/70 text-base sm:text-lg max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4'>
          Choose from thousands of quizzes across all categories or create your
          own to challenge friends and the community.
        </p>

        {/* Action Buttons */}
        <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4'>
          <Button
            asChild
            size='lg'
            className='bg-linear-to-r from-default to-default/60 hover:from-default-hover hover:to-default-hover/60 text-white px-6 sm:px-8 py-4 sm:py-6 font-semibold rounded-xl shadow-lg hover:shadow-default-hover/25 transition-all duration-300 text-sm w-full sm:w-auto'
          >
            <Link href='/quizzes'>
              Explore Quizzes
              <ArrowRight
                className='w-4 h-4 sm:w-5 sm:h-5 ml-2'
                aria-hidden='true'
              />
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className='border-slate-600 text-white dark:hover:bg-slate-800 bg-indigo-400 hover:bg-indigo-300 hover:text-foreground px-6 sm:px-8 py-4 sm:py-6 font-semibold rounded-xl transition-all duration-300 text-sm w-full sm:w-auto'
          >
            <Link href='/create-quiz'>Create Your Own Quiz</Link>
          </Button>
        </div>
      </div>

      {/* Feature Cards - Use mapped data (rendering-hoist-jsx) */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto px-4'>
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.id} {...card} />
        ))}
      </div>

      {/* Join Our Community */}
      <div className='bg-main dark:bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:bg-main-hover cursor-pointer transition-all duration-300 group flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 sm:mt-12 px-6 sm:px-8 py-4 sm:py-5 w-full sm:w-[90%] lg:w-[80%] mx-auto rounded-2xl'>
        <div className='flex items-center gap-3 sm:gap-4 text-center sm:text-left'>
          <div
            className='w-4 h-4 sm:w-8 sm:h-8 bg-default rounded-full flex items-center justify-center shrink-0'
            aria-hidden='true'
          >
            <Users className='w-4 h-4 text-foreground' />
          </div>
          <p className='text-foreground text-sm sm:text-base font-medium'>
            <span className='font-bold'>500,000+</span> quiz enthusiasts have
            joined our community. Will you be next?
          </p>
        </div>
        <Button className='bg-default-hover hover:bg-default-hover text-foreground px-4 sm:px-6 py-2 rounded-lg font-medium shrink-0 text-sm w-full sm:w-auto'>
          Join Now
        </Button>
      </div>
    </section>
  )
})

export default TestKnowledge
