'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Clock } from 'lucide-react'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { useRecentlyPlayedQuizzes } from '@/features/users/hooks/useRecentlyPlayedQuizzes'

export default function RecentlyPlayedSection() {
  const { isAuthenticated } = useAuthState()
  const { items, isLoading } = useRecentlyPlayedQuizzes()

  if (!isAuthenticated) return null

  // Show an empty state instead of returning null so the page rhythm stays
  // stable for signed-in users who haven't played anything yet.
  if (items.length === 0) {
    return (
      <section
        className='mb-10'
        aria-label='Recently played quizzes'
        data-testid='recently-played-empty'
      >
        <h2 className='text-2xl font-bold mb-4'>Recently Played</h2>
        <div className='rounded-lg border border-border bg-main p-6 text-center'>
          <p className='text-sm text-muted-foreground'>
            Play a quiz and it will appear here so you can jump back in.
          </p>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section
        className='mb-10'
        aria-label='Recently played quizzes'
        aria-busy='true'
      >
        <h2 className='text-2xl font-bold mb-4'>Recently Played</h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className='h-36 rounded-lg border border-border bg-muted/30 animate-pulse'
              aria-hidden='true'
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className='mb-10' aria-label='Recently played quizzes'>
      <h2 className='text-2xl font-bold mb-4'>Recently Played</h2>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {items.map((item) => (
          <Card key={item.quizId}>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <Badge variant='outline'>{item.difficulty}</Badge>
                <span className='text-xs text-foreground-secondary flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  {new Date(item.playedAt).toLocaleDateString()}
                </span>
              </div>
              <p className='font-semibold line-clamp-2'>{item.quizTitle}</p>
              <p className='text-sm text-foreground-secondary'>Score: {item.scorePercent}%</p>
              <Button asChild size='sm' className='w-full'>
                <Link href={`/quizzes/${item.slug || item.quizId}/start`}>
                  Play Again
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
