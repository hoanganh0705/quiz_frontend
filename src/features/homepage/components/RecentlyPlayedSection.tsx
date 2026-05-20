'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocalStorage } from '@/hooks'
import { quizzes } from '@/constants/mockQuizzes'
import { Clock } from 'lucide-react'

interface RecentlyPlayedItem {
  quizId: string
  title: string
  playedAt: string
}

export default function RecentlyPlayedSection() {
  const [recentlyPlayed] = useLocalStorage<RecentlyPlayedItem[]>(
    'recently_played_quizzes_v1',
    []
  )

  const items = useMemo(
    () =>
      recentlyPlayed
        .map((entry) => {
          const quiz = quizzes.find((item) => item.id === entry.quizId)
          if (!quiz) return null
          return {
            quiz,
            playedAt: entry.playedAt
          }
        })
        .filter(Boolean)
        .slice(0, 4),
    [recentlyPlayed]
  )

  if (items.length === 0) return null

  return (
    <section className='mb-10' aria-label='Recently played quizzes'>
      <h2 className='text-2xl font-bold mb-4'>Recently Played</h2>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {items.map((item) =>
          item ? (
            <Card key={`${item.quiz.id}-${item.playedAt}`}>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <Badge variant='outline'>{item.quiz.difficulty}</Badge>
                  <span className='text-xs text-foreground/60 flex items-center gap-1'>
                    <Clock className='h-3 w-3' />
                    {new Date(item.playedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className='font-semibold line-clamp-2'>{item.quiz.title}</p>
                <Button asChild size='sm' className='w-full'>
                  <Link href={`/quizzes/${item.quiz.id}/start`}>
                    Play Again
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </section>
  )
}
