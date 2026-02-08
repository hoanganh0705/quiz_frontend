'use client'

import { leaderboardData, LeaderboardEntry } from '@/constants/leaderBoard'
import Image from 'next/image'
import { memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const Leaderboard = memo(function Leaderboard() {
  return (
    <div className='bg-background p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-slate-700/50 overflow-hidden'>
          <Tabs defaultValue='allTime'>
            <TabsList className='grid w-full grid-cols-3 bg-transparent'>
              <TabsTrigger
                value='allTime'
                className={`py-3 px-6 text-sm font-medium rounded-none data-[state=active]:bg-gray-200 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-gray-100 dark:data-[state=inactive]:hover:bg-slate-700/50`}
              >
                All Time
              </TabsTrigger>
              <TabsTrigger
                value='week'
                className={`py-3 px-6 text-sm font-medium rounded-none data-[state=active]:bg-gray-200 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-gray-100 dark:data-[state=inactive]:hover:bg-slate-700/50`}
              >
                Week
              </TabsTrigger>
              <TabsTrigger
                value='today'
                className={`py-3 px-6 text-sm font-medium rounded-none data-[state=active]:bg-gray-200 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:bg-gray-100 dark:data-[state=inactive]:hover:bg-slate-700/50`}
              >
                Today
              </TabsTrigger>
            </TabsList>
            <div className='overflow-x-auto'>
              <TabsContent value='today'>
                <LeaderboardTable data={leaderboardData.today} />
              </TabsContent>
              <TabsContent value='week'>
                <LeaderboardTable data={leaderboardData.week} />
              </TabsContent>
              <TabsContent value='allTime'>
                <LeaderboardTable data={leaderboardData.allTime} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
})

// Rendering optimization: Extract static table renderer outside component (rendering-hoist-jsx)
function LeaderboardTable({ data }: { data: LeaderboardEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='border-b border-gray-200 dark:border-slate-700/50 hover:bg-transparent'>
          <TableHead className='text-left py-4 px-6 text-gray-600 dark:text-slate-300 font-medium text-sm w-15'>
            #
          </TableHead>
          <TableHead className='text-left py-4 px-6 text-gray-600 dark:text-slate-300 font-medium text-sm'>
            Player
          </TableHead>
          <TableHead
            className='text-right py-4 px-6 text-gray-600 dark:text-slate-300 font-medium text-sm'
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            Score
          </TableHead>
          <TableHead
            className='text-right py-4 px-6 text-gray-600 dark:text-slate-300 font-medium text-sm'
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            Time
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((player) => (
          <TableRow
            key={player.id}
            className='border-b border-gray-200 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors'
          >
            <TableCell className='py-4 px-6'>
              <span
                className={`text-lg font-medium ${
                  player.rankTextColor || 'text-gray-800 dark:text-slate-200'
                } ${
                  player.rankBgColor
                    ? `px-2 py-1 rounded ${player.rankBgColor}`
                    : ''
                }`}
              >
                {player.rank}
              </span>
            </TableCell>
            <TableCell className='py-4 px-6'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <Image
                    src={player.avatar || '/placeholder.svg'}
                    alt={`${player.name}'s avatar`}
                    width={40}
                    height={40}
                    loading='lazy'
                    className={`rounded-full border-2 ${
                      player.borderColor ||
                      'border-gray-300 dark:border-slate-600'
                    }`}
                  />
                </div>
                <span className='text-gray-900 dark:text-slate-100 font-medium text-base'>
                  {player.name}
                </span>
              </div>
            </TableCell>
            <TableCell
              className='py-4 px-6 text-right'
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className='text-gray-900 dark:text-slate-100 font-medium text-base'>
                {player.score}%
              </span>
            </TableCell>
            <TableCell
              className='py-4 px-6 text-right'
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className='text-gray-700 dark:text-slate-300 font-medium text-base'>
                {player.time || 'N/A'}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default Leaderboard
