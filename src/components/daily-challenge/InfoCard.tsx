'use client'

import { useState, useEffect, memo } from 'react'
import { Clock, Calendar, Trophy, Flame } from 'lucide-react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'

const InfoCard = memo(function InfoCard() {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    const updateTimer = () => {
      const now: Date = new Date()
      const endOfDay: Date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      )
      const diff: number = endOfDay.getTime() - now.getTime()

      const hours: number = Math.floor(diff / (1000 * 60 * 60))
      const minutes: number = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60)
      )
      const seconds: number = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer() // Initial call
    const interval: NodeJS.Timeout = setInterval(updateTimer, 1000)

    return () => clearInterval(interval) // Cleanup on unmount
  }, [])

  return (
    <section
      className='grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6'
      aria-label='Challenge information'
    >
      <Card className='bg-purple-100 border-purple-200 py-6'>
        <CardContent className='p-4 flex items-center space-x-3'>
          <div className='p-2 bg-purple-200 rounded-full' aria-hidden='true'>
            <Clock className='h-5 w-5 text-purple-700' />
          </div>
          <div>
            <p className='text-sm text-purple-600 font-medium'>
              Time Remaining
            </p>
            <p className='text-xl font-bold text-purple-900' aria-live='polite'>
              {timeRemaining}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='bg-blue-100 border-blue-200 py-6'>
        <CardContent className='p-4 flex items-center space-x-3'>
          <div className='p-2 bg-blue-200 rounded-full' aria-hidden='true'>
            <Calendar className='h-5 w-5 text-blue-700' />
          </div>
          <div>
            <p className='text-sm text-blue-600 font-medium'>Today’s Theme</p>
            <p className='text-lg font-bold text-blue-900'>
              Science & Technology
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='bg-yellow-100 border-yellow-200 py-6'>
        <CardContent className='p-4 flex items-center space-x-3'>
          <div className='p-2 bg-yellow-200 rounded-full' aria-hidden='true'>
            <Trophy className='h-5 w-5 text-yellow-700' />
          </div>
          <div>
            <p className='text-sm text-yellow-600 font-medium'>Top Prize</p>
            <p className='text-xl font-bold text-yellow-900'>500 Coins</p>
          </div>
        </CardContent>
      </Card>

      <Card className='bg-red-50 border-red-200 py-6'>
        <CardContent className='p-4 flex items-center space-x-3'>
          <div className='p-2 bg-red-100 rounded-full' aria-hidden='true'>
            <Flame className='h-5 w-5 text-red-600' />
          </div>
          <div>
            <p className='text-sm text-red-600 font-medium'>Your Streak</p>
            <p className='text-xl font-bold text-red-900'>4 Days</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
})

export default InfoCard
