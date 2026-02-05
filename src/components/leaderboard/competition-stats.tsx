import { memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { CardHeader } from '@/components/ui/card'
import { CardTitle } from '@/components/ui/card'
import { CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Medal, Users, Trophy } from 'lucide-react'

export const CompetitionStats = memo(function CompetitionStats() {
  return (
    <Card className='col-span-1 py-4 sm:py-6 bg-background border border-gray-300 dark:border-slate-700 rounded-xl'>
      <CardHeader>
        <CardTitle className='text-foreground text-lg sm:text-xl font-bold'>
          Competition Stats
        </CardTitle>
        <CardDescription className='text-foreground/80 text-sm'>
          Current season statistics and your ranking
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4 sm:space-y-6'>
        {/* Active Participants */}
        <div className='flex items-center justify-between text-sm sm:text-base'>
          <span className='text-foreground/80 text-sm'>
            Active Participants
          </span>
          <span className='text-foreground font-bold text-sm'>1,248</span>
        </div>

        {/* Top Badge */}
        <div className='flex items-center justify-between text-sm sm:text-base'>
          <span className='text-foreground/80 text-sm'>Top Badge</span>
          <div className='flex items-center gap-2'>
            <Medal
              size={14}
              className='text-yellow-400 sm:w-5 sm:h-5'
              aria-hidden='true'
            />
            <span className='text-foreground font-medium text-sm'>
              Diamond (5 users)
            </span>
          </div>
        </div>

        <div className='space-y-3 sm:space-y-4'>
          {/* Your Rank */}
          <div className='flex items-center bg-main dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 flex-col w-full p-3 sm:p-4 rounded-xl gap-1 sm:gap-2'>
            <div className='flex items-center justify-between w-full'>
              <div className='flex items-center gap-1 sm:gap-2'>
                <Users className='w-4 h-4 text-foreground' aria-hidden='true' />
                <span className='text-foreground/80 text-xs'>Your Rank</span>
              </div>
              <Badge className='bg-default hover:bg-default-hover text-white text-xs'>
                #42
              </Badge>
            </div>

            {/* Progress Info */}
            <div className='flex flex-row justify-between text-xs sm:text-sm text-foreground/80 w-full'>
              <span className='text-foreground/80 text-xs'>Next Level</span>
              <span className='text-foreground text-xs'>
                3,250 / 4,000 points
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className='w-full dark:bg-slate-700 bg-main rounded-full h-1.5 sm:h-2 border border-gray-300 dark:border-slate-700'
              role='progressbar'
              aria-valuenow={81}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Progress to next level'
            >
              <div
                className='dark:bg-white bg-slate-700 h-1 sm:h-1.5 rounded-full'
                style={{ width: '81.25%' }}
              />
            </div>

            {/* Next Level Info */}
            <div className='flex items-center justify-between w-full text-xs sm:text-sm'>
              <div className='flex items-center gap-1 sm:gap-2 text-foreground/80'>
                <Trophy
                  className='w-3 h-3 sm:w-4 sm:h-4 text-foreground/80'
                  aria-hidden='true'
                />
                <span className='text-foreground/80 text-xs'>Silver</span>
              </div>
              <span className='text-foreground text-xs'>
                750 points to Gold
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
