import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Clock,
  HelpCircle,
  Share2,
  Star,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Quiz } from '@/types/quiz'
import { difficultyColors } from '@/constants/difficultColor'
import Overview from '../quizDetail/Overview'
import Leaderboard from '../quizDetail/Leaderboard'
import Reviews from '../quizDetail/Reviews'
import { Card, CardContent } from '../ui/card'
import { formatDuration } from '@/lib/formatDuration'

interface QuizDetailProps {
  quiz: Quiz
}

export default function QuizDetail({ quiz }: QuizDetailProps) {
  // Simulate current players (you can replace this with real data)
  const currentPlayers = quiz.currentPlayers
  const maxPlayers = quiz.maxPlayers
  const spotsLeft = maxPlayers - currentPlayers
  const progressPercentage = (currentPlayers / maxPlayers) * 100

  return (
    <main className='min-h-screen bg-background text-foreground'>
      {/* Header */}
      <div className='p-4'>
        <Link href='/quizzes'>
          <Button
            className='text-white hover:bg-default-hover bg-transparent'
            aria-label='Back to explore quizzes'
          >
            <ArrowLeft className='w-4 h-4 mr-2' aria-hidden='true' />
            Back to Explore
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <div className='relative mx-4 mb-8 rounded-lg h-72 overflow-hidden'>
        <Image
          src={quiz.image}
          alt={`${quiz.title} quiz cover`}
          width={1200}
          height={800}
          quality={100}
          priority
          className='w-full h-full object-cover'
        />

        {/* Quiz Info Overlay */}
        <div className='absolute bottom-0 left-0 p-6 text-white'>
          <div className='flex gap-2 mb-4'>
            <Badge
              className={`${
                difficultyColors[quiz.difficulty].bg || 'bg-gray-600'
              } ${
                difficultyColors[quiz.difficulty]?.hover || 'hover:bg-gray-500'
              } text-white-primary cursor-pointer`}
            >
              {quiz.difficulty}
            </Badge>
            {quiz.isFeatured && (
              <Badge className='cursor-pointer bg-purple-500/80 hover:bg-purple-600 text-white-primary'>
                Featured
              </Badge>
            )}
            {quiz.isPopular && (
              <Badge className='cursor-pointer bg-blue-500/80 hover:bg-blue-600 text-white-primary'>
                Popular
              </Badge>
            )}
          </div>

          <h1 className='text-4xl font-bold mb-4'>{quiz.title}</h1>

          <div className='flex items-center gap-6 text-sm'>
            <div className='flex items-center gap-1'>
              <Clock className='w-4 h-4' aria-hidden='true' />
              <span>{formatDuration(quiz.duration)}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Users className='w-4 h-4' aria-hidden='true' />
              <span>{currentPlayers} players</span>
            </div>
            <div className='flex items-center gap-1'>
              <HelpCircle className='w-4 h-4' aria-hidden='true' />
              <span>{quiz.questionCount} questions</span>
            </div>
            <div className='flex items-center gap-1'>
              <Star
                className='w-4 h-4 fill-amber-400 text-amber-400'
                aria-hidden='true'
              />
              <span>
                {quiz.rating} ({quiz.quizReview.length} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className='gap-8 px-4 grid grid-cols-1 md:grid-cols-3 '>
        {/* Main Content */}
        <div className='flex-1 col-span-2'>
          <Tabs defaultValue='overview' className='w-full'>
            <TabsList className='grid w-full grid-cols-3 dark:bg-[#1e293b80]'>
              <TabsTrigger
                value='overview'
                className='dark:data-[state=active]:bg-slate-700 data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground/70'
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value='leaderboard'
                className='dark:data-[state=active]:bg-slate-700 data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground/70'
              >
                Leaderboard
              </TabsTrigger>
              <TabsTrigger
                value='reviews'
                className='dark:data-[state=active]:bg-slate-700 data-[state=active]:bg-background data-[state=active]:text-foreground text-foreground/70'
              >
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='mt-6'>
              <Overview
                description={quiz.description}
                requirements={quiz.requirements}
                duration={quiz.duration}
                tags={quiz.tags}
              />
            </TabsContent>

            <TabsContent value='leaderboard' className='mt-6 bg-background'>
              <Leaderboard />
            </TabsContent>

            <TabsContent value='reviews' className='mt-6'>
              <Reviews />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className='col-span-1'>
          <div className='space-y-6 text-foreground border border-gray-300 dark:border-slate-700 rounded-lg p-4 bg-background'>
            {/* Spots Filled */}
            <div className='bg-background rounded-lg p-4 pb-0'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-foreground'>Registered Spots</span>
                <span className='font-bold text-foreground text-sm'>
                  {currentPlayers}/{maxPlayers}
                </span>
              </div>
              <Progress value={progressPercentage} className='mb-3' />
              <p
                className={`text-sm font-medium ${
                  spotsLeft <= 0.1 * maxPlayers
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}
                aria-live='polite'
              >
                {spotsLeft <= 0.1 * maxPlayers
                  ? `Almost full! Only ${spotsLeft} spots left`
                  : `${spotsLeft} spots left`}
              </p>
            </div>

            {/* Quiz Details */}
            <div className='bg-background p-4 rounded-lg mb-3'>
              {/* Quiz Details Grid */}
              <div className='grid grid-cols-2 gap-4 mb-5 grid-rows-[auto] items-stretch'>
                <Card className='bg-background border dark:border-slate-700 border-gray-300 h-full'>
                  <CardContent className='rounded-lg border p-3 h-full'>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Category
                    </div>
                    <div className='font-medium'>
                      Science &<br />
                      Technology
                    </div>
                  </CardContent>
                </Card>

                <Card className='bg-background border dark:border-slate-700 border-gray-300 h-full'>
                  <CardContent className='rounded-lg border p-3 h-full '>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Questions
                    </div>
                    <div className='font-medium'>25</div>
                  </CardContent>
                </Card>

                <Card className='bg-background border dark:border-slate-700 border-gray-300 h-full'>
                  <CardContent className='rounded-lg border p-3 h-full '>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Time Limit
                    </div>
                    <div className='font-medium'>20 min</div>
                  </CardContent>
                </Card>

                <Card className='bg-background border dark:border-slate-700 border-gray-300 h-full'>
                  <CardContent className='rounded-lg border p-3 h-full '>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Difficulty
                    </div>
                    <div className='font-medium'>Medium</div>
                  </CardContent>
                </Card>
              </div>

              {/* Creator Profile */}
              <Card className='bg-background border dark:border-slate-700 border-gray-300 mb-5'>
                <CardContent className='p-4'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='w-12 h-12 rounded-full overflow-hidden bg-slate-600'>
                      <Image
                        src={quiz.creator.imageURL}
                        alt={`${quiz.creator.name}'s name`}
                        width={48}
                        height={48}
                        className='w-full h-full object-cover'
                      />
                    </div>
                    <div>
                      <div className='text-foreground'>{quiz.creator.name}</div>
                      <div className='text-foreground/70 text-xs'>
                        {quiz.creator.position}
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-between text-sm'>
                    <div>
                      <span className='text-muted-foreground'>Quizzes: </span>
                      <span className='text-foreground font-semibold'>
                        {quiz.creator.quizzesCreated}
                      </span>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>Updated: </span>
                      <span className='text-foreground'>{quiz.updatedAt}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Play Button */}
              <Link href={`/quizzes/${quiz.id}/start`} className='block'>
                <Button
                  className='w-[98%] mx-auto flex justify-center items-center bg-default hover:bg-default-hover text-white font-semibold py-4 text-base rounded-xl'
                  size='lg'
                >
                  Play now
                </Button>
              </Link>

              {/* Action Buttons */}
              <div className='flex justify-center gap-6 pt-2 mt-3'>
                <Button
                  size='icon'
                  className='text-foreground rounded-xl border border-gray-300 dark:border-slate-700 bg-transparent'
                  aria-label='Bookmark this quiz'
                >
                  <Bookmark className='h-6 w-6' />
                </Button>

                <Button
                  size='icon'
                  className='text-foreground rounded-xl border border-gray-300 dark:border-slate-700 bg-transparent'
                  aria-label='Share this quiz'
                >
                  <Share2 className='h-6 w-6' />
                </Button>

                <Button
                  size='icon'
                  className='text-foreground rounded-xl border border-gray-300 dark:border-slate-700 bg-transparent'
                  aria-label='Get notifications for this quiz'
                >
                  <Bell className='h-6 w-6' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
