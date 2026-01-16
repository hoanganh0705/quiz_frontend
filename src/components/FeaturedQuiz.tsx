'use client'

import { Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'
import SpotAvailabilityIndicator from '@/components/SpotAvailabiltyIndicator'
import { quizzes } from '@/constants/mockQuizzes'
import Link from 'next/link'

const FeaturedQuiz = () => {
  const tabs = ['All', 'Hot', 'Trending', "Editor's"] as const

  const getFiltered = (tab: (typeof tabs)[number]) => {
    if (tab === 'All') return quizzes
    if (tab === 'Hot') return quizzes.filter((q) => q.badges.includes('Hot'))
    if (tab === 'Trending')
      return quizzes.filter((q) => q.badges.includes('Trending'))
    if (tab === "Editor's")
      return quizzes.filter((q) => q.badges.includes("Editor's Choice"))
    return quizzes
  }

  return (
    <div className='mb-15'>
      <Tabs defaultValue='All' className='w-full xl:w-auto'>
        <div className='flex items-center justify-between'>
          {/* Header */}
          <div className='mb-5'>
            <h2 className='text-2xl font-bold mb-1 text-foreground'>
              Featured Quizzes
            </h2>
            <p className='text-slate-400'>
              Specially selected quizzes you don&apos;t want to miss
            </p>
          </div>
          <TabsList className='flex gap-3 rounded-lg p-1 overflow-x-auto scrollbar-hide w-full xl:w-auto bg-transparent'>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className='whitespace-nowrap data-[state=inactive]:bg-main data-[state=inactive]:text-foreground'
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Filter Tabs (scrollable on mobile) */}

        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab} className='mt-6'>
            {/* Responsive Grid for Quizzes */}
            <div
              className='
          grid gap-6 
          grid-cols-1 
          sm:grid-cols-2 
          lg:grid-cols-3 
          xl:grid-cols-4
        '
            >
              {getFiltered(tab).map((quiz) => (
                <div
                  key={quiz.id}
                  className='border border-gray-300 dark:border-slate-700 text-foreground rounded-xl overflow-hidden cursor-pointer'
                >
                  {/* Quiz Image */}
                  <div
                    className={`relative`}
                    style={{
                      height: quiz.image ? '200px' : '150px'
                    }}
                  >
                    <Image
                      src={quiz.image || '/placeholder.svg'}
                      alt={quiz.title}
                      fill
                      className='object-cover hover:scale-105 transition-transform duration-200'
                    />

                    {/* Badges */}
                    <div className='absolute top-3 left-3 right-3 flex justify-between flex-wrap gap-2'>
                      {quiz.timeLeft && (
                        <Badge className='bg-transparent text-white'>
                          <Clock className='w-3 h-3 mr-1' />
                          {quiz.timeLeft} {quiz.timeLeft === 1 ? 'day' : 'days'}{' '}
                          left
                        </Badge>
                      )}
                      <div className='flex flex-wrap gap-1'>
                        {quiz.badges.map((badge) => (
                          <Badge
                            key={badge}
                            className={`text-white rounded-full border px-2.5 py-0.5 text-xs font-semibold flex items-center ${
                              badge === 'Hot'
                                ? 'bg-[#7F1D1D] hover:bg-[#7F1D1D]/80'
                                : badge === "Editor's Choice"
                                ? 'bg-violet-500 hover:bg-violet-600'
                                : badge === 'Trending'
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-[#EAB308] hover:bg-[#EAB308]/80'
                            }`}
                          >
                            {badge === 'Hot' && '🔥'}
                            {badge === "Editor's Choice" && '⭐'}
                            {badge === 'Trending' && '📈'}
                            {badge === 'Top Rated' && '⭐'}
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Quiz Title */}
                    <div className='absolute bottom-0 left-0 right-0 p-4'>
                      <h3 className='font-bold text-base mb-1 leading-tight text-white'>
                        {quiz.title}
                      </h3>
                      <p className='text-sm leading-tight text-white'>
                        {quiz.categories.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Quiz Details */}
                  <div className='p-4 flex flex-col gap-3'>
                    {/* Creator Info */}
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2 flex-1 min-w-0'>
                        <Avatar className='w-8 h-8 shrink-0'>
                          <AvatarImage
                            src={quiz.creator.imageURL || '/placeholder.svg'}
                          />
                          <AvatarFallback>AS</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium text-sm text-foreground truncate'>
                            {quiz.creator.name}
                          </p>
                          <div className='flex items-center gap-1'>
                            <Star className='w-3 h-3 text-yellow-400' />
                            <span className='text-xs text-foreground'>
                              {quiz.creator.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-xs text-foreground'>Reward</p>
                        <p className='font-bold text-green-400'>
                          $ {quiz.reward}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='flex items-start gap-2 text-xs text-foreground/70 -translate-x-1'>
                      <SpotAvailabilityIndicator
                        currentSpots={quiz.spots - quiz.spotsLeft}
                        totalSpots={quiz.spots}
                        mode='percentage'
                      />
                      <div className='flex items-start flex-col flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <div className='*:data-[slot=avatar]:ring-main flex -space-x-2 *:data-[slot=avatar]:ring-2'>
                            {quiz.currentPlayers > 0 &&
                              (quiz.currentPlayers > 3 ? (
                                <Avatar className='w-6 h-6'>
                                  <AvatarImage
                                    src={
                                      quiz.creator.imageURL ||
                                      '/placeholder.svg'
                                    }
                                    alt={quiz.creator.name}
                                  />
                                  <AvatarFallback>
                                    {quiz.currentPlayers - 3}+
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                quiz.currentPlayers > 0 &&
                                Array.from({
                                  length: quiz.currentPlayers
                                }).map((_, playerIndex) => (
                                  <Avatar
                                    key={`${quiz.id}-player-${playerIndex}`}
                                    className='w-6 h-6 bg-main text-foreground'
                                  >
                                    <AvatarImage
                                      src={`https://randomuser.me/api/portraits/lego/${playerIndex}.jpg`}
                                      alt={`Player ${playerIndex}`}
                                    />
                                    <AvatarFallback>
                                      {playerIndex + 1}
                                    </AvatarFallback>
                                  </Avatar>
                                ))
                              ))}
                          </div>
                          <span className='text-sm text-foreground font-semibold'>
                            {quiz.currentPlayers} players joined
                          </span>
                        </div>
                        <p className='text-xs text-foreground'>
                          {quiz.spotsLeft} spots available
                        </p>
                      </div>
                    </div>

                    {/* Play Button */}
                    <Button className='text-sm w-full mt-2 text-white '>
                      <Link
                        href={`/quizzes/${quiz.title
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        Play Now
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default FeaturedQuiz
