import { memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Flame, Trophy, Settings } from 'lucide-react'
import Link from 'next/link'

export const QuickActions = memo(function QuickActions() {
  return (
    <Card>
      <CardContent className='p-4'>
        <h2 className='text-base font-bold text-foreground mb-4'>
          Quick Actions
        </h2>
        <nav className='space-y-2' aria-label='Quick actions'>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/create-quiz' aria-label='Create a new quiz'>
              <Edit className='w-4 h-4' aria-hidden='true' />
              Create New Quiz
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/daily-challenge' aria-label='Take daily challenge'>
              <Flame className='w-4 h-4' aria-hidden='true' />
              Daily Challenge
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/leaderboard' aria-label='View leaderboard'>
              <Trophy className='w-4 h-4' aria-hidden='true' />
              View Leaderboard
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/settings' aria-label='Open account settings'>
              <Settings className='w-4 h-4' aria-hidden='true' />
              Account Settings
            </Link>
          </Button>
        </nav>
      </CardContent>
    </Card>
  )
})
