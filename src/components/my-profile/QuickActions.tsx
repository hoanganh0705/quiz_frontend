import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Flame, Trophy, Settings } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <Card className='bg-main'>
      <CardContent className='p-4'>
        <h2 className='text-base font-bold text-foreground mb-4'>
          Quick Actions
        </h2>
        <div className='space-y-2'>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/create-quiz'>
              <Edit className='w-4 h-4' />
              Create New Quiz
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/daily-challenge'>
              <Flame className='w-4 h-4' />
              Daily Challenge
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/leaderboard'>
              <Trophy className='w-4 h-4' />
              View Leaderboard
            </Link>
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start gap-2'
            asChild
          >
            <Link href='/settings'>
              <Settings className='w-4 h-4' />
              Account Settings
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
