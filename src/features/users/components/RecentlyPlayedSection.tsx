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
  if (isLoading && items.length === 0) return null
  if (items.length === 0) return null

  return (
    <section className='mb-10' aria-label='Recently played quizzes'>
      <h2 className='text-2xl font-bold mb-4'>Recently Played</h2>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {items.map((item) => (
          <Card key={item.quizId}>
            <CardContent className='p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <Badge variant='outline'>{item.difficulty}</Badge>
                <span className='text-xs text-foreground/70 flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  {new Date(item.playedAt).toLocaleDateString()}
                </span>
              </div>
              <p className='font-semibold line-clamp-2'>{item.quizTitle}</p>
              <p className='text-sm text-foreground/70'>Score: {item.scorePercent}%</p>
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
