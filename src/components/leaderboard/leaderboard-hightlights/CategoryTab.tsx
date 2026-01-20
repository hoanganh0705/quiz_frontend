'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Target, BarChart3, Zap, Star } from 'lucide-react'
import { LeaderboardUser } from '../leaderboard-highlights'

interface CategoryTabProps {
  users: LeaderboardUser[]
  isLoading: boolean
  category: string
}

export default function CategoryTab({
  users,
  isLoading,
  category
}: CategoryTabProps) {
  if (isLoading) return null

  return (
    <div className='space-y-4 mb-20'>
      <div className='relative'>
        <div className='flex items-end justify-center gap-4 mb-8'>
          {/* Second Place */}
          {users[1] && (
            <div className='flex flex-col items-center'>
              <div className='relative mb-3'>
                <div className='w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#d1d5db] ring-offset-2 ring-offset-main'>
                  <Image
                    src={users[1].avatar || '/placeholder.svg'}
                    alt={users[1].name}
                    width={80}
                    height={80}
                    className='w-full h-full object-cover'
                  />
                </div>
                <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-6 h-6 bg-[#d1d5db] rounded-full flex items-center justify-center'>
                  <span className='font-bold text-xs text-white'>2</span>
                </div>
              </div>
              <h3 className='text-foreground font-bold text-base mb-1'>
                {users[1].name}
              </h3>
              <p className='text-foreground/80 text-sm mb-2'>
                {users[1].points.toLocaleString()} pts
              </p>
              <div className='flex items-center gap-2 mb-2'>
                <Badge className='bg-slate-600 hover:bg-slate-700 text-xs dark:bg-slate-600 dark:hover:bg-slate-700 text-white'>
                  💎 Platinum
                </Badge>
                <Badge
                  variant='outline'
                  className='border-yellow-400 text-foreground text-xs'
                >
                  ⭐65
                </Badge>
              </div>
              <div className='dark:bg-slate-800/50 bg-[#edf2f8] rounded-lg p-4 w-32 h-24'></div>
            </div>
          )}

          {/* First Place */}
          {users[0] && (
            <div className='flex flex-col items-center -mt-8'>
              <div className='relative mb-3'>
                <div className='w-24 h-24 rounded-full overflow-hidden ring-2 ring-yellow-400 dark:ring-yellow-500 ring-offset-2 ring-offset-main'>
                  <Image
                    src={users[0].avatar || '/placeholder.svg'}
                    alt={users[0].name}
                    width={96}
                    height={96}
                    className='w-full h-full object-cover'
                  />
                </div>
                <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-6 h-6 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center'>
                  <span className='font-bold text-xs text-white'>1</span>
                </div>
                <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                  <div className='text-2xl'>👑</div>
                </div>
              </div>
              <h3 className='text-foreground font-bold text-lg mb-1'>
                {users[0].name}
              </h3>
              <p className='text-foreground/80 text-base mb-2'>
                {users[0].points.toLocaleString()} pts
              </p>
              <div className='flex items-center gap-2 mb-2'>
                <Badge className='bg-blue-600 hover:bg-blue-700 text-sm dark:bg-blue-600 dark:hover:bg-blue-700 text-white'>
                  💎 Diamond
                </Badge>
                <Badge
                  variant='outline'
                  className='border-yellow-400 text-foreground text-sm'
                >
                  ⭐78
                </Badge>
              </div>
              <div className='dark:bg-slate-800/50 bg-[#edf2f8] rounded-lg p-4 w-36 h-32'></div>
            </div>
          )}

          {/* Third Place */}
          {users[2] && (
            <div className='flex flex-col items-center'>
              <div className='relative mb-3'>
                <div className='w-20 h-20 rounded-full overflow-hidden ring-2 ring-orange-500 dark:ring-orange-600 ring-offset-2 ring-offset-main'>
                  <Image
                    src={users[2].avatar || '/placeholder.svg'}
                    alt={users[2].name}
                    width={80}
                    height={80}
                    className='w-full h-full object-cover'
                  />
                </div>
                <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-6 h-6 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center'>
                  <span className='font-bold text-xs text-white'>3</span>
                </div>
              </div>
              <h3 className='text-foreground font-bold text-base mb-1'>
                {users[2].name}
              </h3>
              <p className='text-foreground/80 text-sm mb-2'>
                {users[2].points.toLocaleString()} pts
              </p>
              <div className='flex items-center gap-2 mb-2'>
                <Badge className='bg-yellow-600 hover:bg-yellow-700 text-xs dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white'>
                  🥇 Gold
                </Badge>
                <Badge
                  variant='outline'
                  className='border-yellow-400 text-foreground text-xs'
                >
                  ⭐59
                </Badge>
              </div>
              <div className='dark:bg-slate-800/50 bg-[#edf2f8] rounded-lg p-4 w-32 h-20 text-white'></div>
            </div>
          )}
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
          <div className='dark:bg-slate-800/50 bg-[#edf2f8] p-3 rounded-lg text-center'>
            <div className='flex items-center justify-center mb-2'>
              <Target className='w-4 h-4 text-green-400' />
            </div>
            <p className='text-lg font-bold text-foreground'>
              {users[0]?.winRate}%
            </p>
            <p className='text-xs text-foreground/80'>
              Top Win Rate in {category}
            </p>
          </div>
          <div className='dark:bg-slate-800/50 bg-[#edf2f8] p-3 rounded-lg text-center'>
            <div className='flex items-center justify-center mb-2'>
              <BarChart3 className='w-4 h-4 text-blue-400' />
            </div>
            <p className='text-lg font-bold text-foreground'>
              {users[0]?.quizzesCompleted}
            </p>
            <p className='text-xs text-foreground/80'>
              Most Quizzes in {category}
            </p>
          </div>
          <div className='dark:bg-slate-800/50 bg-[#edf2f8] p-3 rounded-lg text-center'>
            <div className='flex items-center justify-center mb-2'>
              <Zap className='w-4 h-4 text-orange-400' />
            </div>
            <p className='text-lg font-bold text-foreground'>
              {Math.max(...users.map((u) => u.streak))}
            </p>
            <p className='text-xs text-foreground/80'>
              Longest Streak in {category}
            </p>
          </div>
          <div className='dark:bg-slate-800/50 bg-[#edf2f8] p-3 rounded-lg text-center'>
            <div className='flex items-center justify-center mb-2'>
              <Star className='w-4 h-4 text-yellow-400' />
            </div>
            <p className='text-lg font-bold text-foreground'>
              {Math.max(...users.map((u) => u.stars))}
            </p>
            <p className='text-xs text-foreground/80'>
              Top Rating in {category}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
