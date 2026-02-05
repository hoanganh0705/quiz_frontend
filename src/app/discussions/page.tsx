import { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
// Fix barrel imports (bundle-barrel-imports)
import { Tabs } from '@/components/ui/tabs'
import { TabsList } from '@/components/ui/tabs'
import { TabsTrigger } from '@/components/ui/tabs'
import { TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { AvatarFallback } from '@/components/ui/avatar'
import { AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, MessageSquare, CheckCircle2, XCircle } from 'lucide-react'
import { discussions } from '@/constants/discussion'

// Extract DiscussionCard component (vercel-composition-patterns)
interface DiscussionCardProps {
  discussion: (typeof discussions)[0]
}

const DiscussionCard = memo(function DiscussionCard({
  discussion
}: DiscussionCardProps) {
  return (
    <Card className='bg-transparentrounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-300 dark:border-slate-700 p-10'>
      <div className='flex-1 gap-2 flex flex-col'>
        <h3 className='text-lg font-semibold'>{discussion.title}</h3>
        <div className='flex items-center gap-2 text-foreground text-sm'>
          <Badge className='bg-transparent text-foreground px-2 py-1 rounded-md border border-gray-300 dark:border-slate-700'>
            {discussion.category}
          </Badge>
          <Badge
            className={`px-2 py-1 rounded-md border border-gray-300 dark:border-slate-700 ${
              discussion.difficulty === 'Medium'
                ? 'bg-[#d97706] text-white'
                : 'bg-[#dc2626] text-white'
            }`}
          >
            {discussion.difficulty}
          </Badge>
          <span className='text-foreground'>
            Last activity: {discussion.lastActivity}
          </span>
        </div>
        <div className='flex items-center gap-2 mt-2'>
          <Avatar className='w-8 h-8'>
            <AvatarImage
              src={discussion.user.avatarSrc}
              alt={discussion.user.username}
            />
            <AvatarFallback>{discussion.user.avatarFallback}</AvatarFallback>
          </Avatar>
          <span className='text-foreground font-semibold text-sm'>
            {discussion.user.username}
          </span>
        </div>
      </div>
      <div className='flex flex-col items-end sm:ml-auto gap-10'>
        <div className='flex items-center gap-1 text-foreground/70'>
          <MessageSquare className='w-4 h-4' aria-hidden='true' />
          <span className='text-sm text-foreground'>
            {discussion.comments} comments
          </span>
        </div>
        <div
          className='flex items-center gap-3 text-sm'
          role='group'
          aria-label='Answer statistics'
        >
          <div className='flex items-center gap-1 text-green-500'>
            <CheckCircle2 className='w-4 h-4' aria-hidden='true' />
            <span>{discussion.correct}</span>
          </div>
          <div className='flex items-center gap-1 text-red-500'>
            <XCircle className='w-4 h-4' aria-hidden='true' />
            <span>{discussion.incorrect}</span>
          </div>
          <span
            className='font-semibold text-foreground'
            aria-label={`${discussion.percentage} percent correct`}
          >
            {discussion.percentage}%
          </span>
        </div>
      </div>
    </Card>
  )
})

const QuizDiscussions = memo(function QuizDiscussions() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className=''>
        {/* Header Section */}
        <header className='space-y-2' role='banner'>
          <h1 className='text-3xl font-bold'>Quiz Discussions</h1>
          <p className='text-foreground/70 text-base'>
            Join discussions about quizzes, share explanations, and learn from
            the community.
          </p>
        </header>

        {/* Search and Filter Section */}
        <section
          className='flex flex-col sm:flex-row items-center gap-4 mt-5 xl:mt-8 mb-5 xl:mb-8'
          role='search'
          aria-label='Search and filter discussions'
        >
          <div className='relative flex-1 w-full border border-gray-300 dark:border-slate-700 rounded-md'>
            <Search
              className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/70'
              aria-hidden='true'
            />
            <Input
              type='search'
              placeholder='Search discussions...'
              className='w-full pl-10 pr-4 py-2 border-none text-foreground placeholder:text-foreground/70 focus:ring-offset-0 focus:ring-0'
              aria-label='Search discussions'
            />
          </div>
          <div
            className='flex gap-2 w-full sm:w-auto'
            role='toolbar'
            aria-label='Discussion filters'
          >
            <Button
              className='bg-background hover:bg-main text-foreground px-6 py-2 rounded-md border border-gray-300 dark:border-slate-700'
              aria-label='Filter discussions'
            >
              Filter
            </Button>
            <Button
              className='bg-background  hover:bg-main text-foreground px-6 py-2 rounded-md border border-gray-300 dark:border-slate-700'
              aria-label='Sort discussions'
            >
              Sort
            </Button>
          </div>
        </section>

        {/* Discussion Tabs */}
        <Tabs defaultValue='recent' className='w-full '>
          <TabsList className='w-full justify-start overflow-x-auto scrollbar-hide border border-gray-300 dark:border-slate-700 rounded-md'>
            <TabsTrigger
              value='recent'
              className='text-xs sm:text-sm md:text-base font-medium px-2 sm:px-3 md:px-4 shrink-0 transition-transform data-[state=active]:bg-background text-foreground/70'
            >
              <span className='hidden sm:inline text-sm'>
                Recent Discussions
              </span>
              <span className='sm:hidden'>Recent</span>
            </TabsTrigger>
            <TabsTrigger
              value='popular'
              className='text-xs sm:text-sm md:text-base font-medium px-2 sm:px-3 md:px-4 shrink-0 transition-transform data-[state=active]:bg-background text-foreground/70'
            >
              <span className='hidden sm:inline text-sm'>
                Popular Discussions
              </span>
              <span className='sm:hidden'>Popular</span>
            </TabsTrigger>
            <TabsTrigger
              value='your'
              className='text-xs sm:text-sm md:text-base font-medium px-2 sm:px-3 md:px-4 shrink-0 transition-transform data-[state=active]:bg-background text-foreground/70'
            >
              <span className='hidden sm:inline text-sm'>Your Discussions</span>
              <span className='sm:hidden'>Yours</span>
            </TabsTrigger>
          </TabsList>

          {/* Recent Discussions Content */}
          <TabsContent value='recent' className='mt-6 space-y-4 '>
            {discussions.map((discussion) => (
              <DiscussionCard key={discussion.id} discussion={discussion} />
            ))}
          </TabsContent>

          {/* Popular Discussions Content (Placeholder) */}
          <TabsContent
            value='popular'
            className='mt-6 p-6 bg-transparent rounded-lg'
          >
            <section>
              <h2 className='text-xl font-bold text-foreground'>
                Popular Discussions
              </h2>
              <p className='text-foreground/70 mt-2'>
                Content for popular discussions will be displayed here.
              </p>
            </section>
          </TabsContent>

          {/* Your Discussions Content (Placeholder) */}
          <TabsContent
            value='your'
            className='mt-6 p-6 bg-transparent rounded-lg'
          >
            <section>
              <h2 className='text-xl font-bold text-foreground'>
                Your Discussions
              </h2>
              <p className='text-foreground/70 mt-2'>
                Content for your discussions will be displayed here.
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
})

export default QuizDiscussions
