'use client'

import { memo, useEffect, useState } from 'react'
import { Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import Image from 'next/image'
import SpotAvailabilityIndicator from '@/features/quizzes/components/SpotAvailabilityIndicator'
import { listQuizzes } from '@/features/quizzes/api'
import type { QuizResponseDto } from '@/lib/api/generated/schemas'
import Link from 'next/link'

const FeaturedQuiz = memo(function FeaturedQuiz() {
  const [quizzes, setQuizzes] = useState<QuizResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const tabs = ['All', 'Featured', 'Popular'] as const

  useEffect(() => {
    async function fetchFeaturedQuizzes() {
      try {
        const data = await listQuizzes({ featured: true, limit: 20 })
        setQuizzes(data.items)
      } catch (error) {
        console.error('Failed to fetch featured quizzes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFeaturedQuizzes()
  }, [])

  const getFiltered = (tab: (typeof tabs)[number]) => {
    if (tab === 'All') return quizzes
    if (tab === 'Featured') return quizzes.filter((q) => q.isFeatured)
    if (tab === 'Popular') return quizzes.slice(0, 8) // TODO: Replace with actual popularity metric
    return quizzes
  }

  if (loading) {
    return (
      <div className='mb-15'>
        <div className='mb-5'>
          <h2 className='text-2xl font-bold mb-1 text-foreground'>
            Featured Quizzes
          </h2>
          <p className='text-muted-foreground'>
            Specially selected quizzes you don&apos;t want to miss
          </p>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='border border-border rounded-xl overflow-hidden animate-pulse'>
              <div className='h-48 bg-muted' />
              <div className='p-4 space-y-3'>
                <div className='h-4 w-3/4 bg-muted rounded' />
                <div className='h-3 w-1/2 bg-muted rounded' />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (quizzes.length === 0) return null

  return (
    <div className='mb-15'>
      <Tabs defaultValue='All' className='w-full xl:w-auto'>
        <div className='flex items-center justify-between'>
          <div className='mb-5'>
            <h2 className='text-2xl font-bold mb-1 text-foreground'>
              Featured Quizzes
            </h2>
            <p className='text-muted-foreground'>
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

        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab} className='mt-6'>
            <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {getFiltered(tab).map((quiz) => (
                <div
                  key={quiz.quizId}
                  className='border border-border text-foreground rounded-xl overflow-hidden cursor-pointer'
                >
                  <div className='relative h-48'>
                    <Image
                      src={quiz.imageUrl ?? '/placeholder.webp'}
                      alt={`${quiz.title} quiz cover`}
                      fill
                      loading='lazy'
                      className='object-cover hover:scale-105 transition-transform duration-200'
                    />

                    <div className='absolute top-3 left-3 right-3 flex justify-between flex-wrap gap-2'>
                      {quiz.isFeatured && (
                        <Badge className='bg-transparent text-white'>
                          <Star className='w-3 h-3 mr-1' aria-hidden='true' />
                          Featured
                        </Badge>
                      )}
                    </div>

                    <div className='absolute bottom-0 left-0 right-0 p-4'>
                      <h3 className='font-bold text-base mb-1 leading-tight text-white line-clamp-2'>
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className='text-sm leading-tight text-white/80 line-clamp-1'>
                          {quiz.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='p-4 flex flex-col gap-3'>
                    <div className='flex items-center justify-end'>
                      <div className='text-right shrink-0'>
                        <p className='text-xs text-foreground'>Updated</p>
                        <p className='font-medium text-sm text-foreground'>
                          {new Date(quiz.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Button asChild className='text-sm w-full mt-2 text-white'>
                      <Link href={`/quizzes/${quiz.slug}`}>
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
})

export default FeaturedQuiz
