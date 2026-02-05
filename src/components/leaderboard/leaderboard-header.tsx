/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, memo, useCallback } from 'react'
import { FindFriendsPopup } from './find-friends-popup'
import { YourRankingPopup } from './your-ranking-popup'
import {
  Trophy,
  Star,
  TrendingUp,
  Users,
  Crown,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react'

interface LeaderboardHeaderProps {
  onFindFriends?: () => void
  onYourRanking?: () => void
  userRank?: number
  userPoints?: number
  userBadge?: string
  userStreak?: number
  totalParticipants?: number
  seasonEndDate?: string
}

// Hoist helper functions outside component (data-hoisting)
const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'Diamond':
      return 'bg-blue-600'
    case 'Platinum':
      return 'bg-slate-600'
    case 'Gold':
      return 'bg-yellow-600'
    case 'Silver':
      return 'bg-gray-500'
    case 'Bronze':
      return 'bg-orange-600'
    default:
      return 'bg-gray-500'
  }
}

const getRankColor = (rank: number) => {
  if (rank <= 3) return 'text-yellow-400'
  if (rank <= 10) return 'text-blue-400'
  if (rank <= 50) return 'text-green-400'
  return 'text-slate-400'
}

const formatSeasonEndDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Season ended'
  if (diffDays === 1) return '1 day left'
  if (diffDays <= 7) return `${diffDays} days left`
  return `${diffDays} days left`
}

export const LeaderboardHeader = memo(function LeaderboardHeader({
  onFindFriends,
  onYourRanking,
  userRank = 42,
  userPoints = 3250,
  userBadge = 'Silver',
  userStreak = 7,
  totalParticipants = 1248,
  seasonEndDate = '2024-03-31'
}: LeaderboardHeaderProps) {
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showYourRanking, setShowYourRanking] = useState(false)

  const handleShowFindFriends = useCallback(() => {
    setShowFindFriends(true)
  }, [])

  const handleCloseFindFriends = useCallback(() => {
    setShowFindFriends(false)
  }, [])

  const handleShowYourRanking = useCallback(() => {
    setShowYourRanking(true)
  }, [])

  const handleCloseYourRanking = useCallback(() => {
    setShowYourRanking(false)
  }, [])

  return (
    <>
      <div className='mb-6 sm:mb-8 space-y-6'>
        {/* Main Header */}
        <header
          className='space-y-4 flex flex-col xl:flex-row justify-between items-start xl:items-center'
          role='banner'
        >
          <div className='text-center xl:text-left'>
            <h1 className='text-2xl sm:text-3xl font-bold mb-2 text-foreground flex items-center gap-2'>
              <Crown
                className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-400'
                aria-hidden='true'
              />
              Leader Board
            </h1>
            <p className='text-foreground/80 text-sm sm:text-base'>
              See who&apos;s leading the pack in our global quiz rankings.
            </p>
          </div>

          <div
            className='flex flex-wrap gap-2 justify-center items-center'
            role='toolbar'
            aria-label='Leaderboard actions'
          >
            <Button
              className='bg-default hover:bg-default-hover text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 flex items-center gap-2'
              onClick={handleShowFindFriends}
              aria-label='Find friends on leaderboard'
            >
              <Users className='w-3 h-3 sm:w-4 sm:h-4' aria-hidden='true' />
              Find Friends
            </Button>
            <Button
              className='bg-default hover:bg-default-hover text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 flex items-center gap-2'
              onClick={handleShowYourRanking}
              aria-label='View your ranking details'
            >
              <Trophy className='w-3 h-3 sm:w-4 sm:h-4' aria-hidden='true' />
              Your Ranking
            </Button>
          </div>
        </header>

        {/* Stats Overview */}
        <section
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
          aria-label='Leaderboard statistics overview'
        >
          {/* Total Participants */}
          <div className='dark:bg-slate-800/50 background  p-4 rounded-lg border border-gray-300 dark:border-slate-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Total Participants</p>
                <p className='text-foreground font-bold text-lg'>
                  {totalParticipants.toLocaleString()}
                </p>
              </div>
              <div
                className='w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center'
                aria-hidden='true'
              >
                <Users className='w-5 h-5 text-blue-400' />
              </div>
            </div>
          </div>

          {/* Season End */}
          <div className='dark:bg-slate-800/50  bg-background p-4 rounded-lg border border-gray-300 dark:border-slate-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Season Ends</p>
                <p className='text-foreground font-bold text-lg'>
                  {formatSeasonEndDate(seasonEndDate)}
                </p>
              </div>
              <div
                className='w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center'
                aria-hidden='true'
              >
                <Calendar className='w-5 h-5 text-purple-400' />
              </div>
            </div>
          </div>

          {/* Your Rank */}
          <div className='dark:bg-slate-800/50  bg-background p-4 rounded-lg border border-gray-300 dark:border-slate-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Your Rank</p>
                <p className={`font-bold text-lg ${getRankColor(userRank)}`}>
                  #{userRank}
                </p>
              </div>
              <div
                className='w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center'
                aria-hidden='true'
              >
                <Trophy className='w-5 h-5 text-yellow-400' />
              </div>
            </div>
          </div>

          {/* Your Points */}
          <div className='dark:bg-slate-800/50  bg-background p-4 rounded-lg border border-gray-300 dark:border-slate-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Your Points</p>
                <p className='text-foreground font-bold text-lg'>
                  {userPoints.toLocaleString()}
                </p>
              </div>
              <div
                className='w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center'
                aria-hidden='true'
              >
                <Star className='w-5 h-5 text-green-400' />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Popups */}
      <FindFriendsPopup
        isOpen={showFindFriends}
        onClose={handleCloseFindFriends}
      />

      <YourRankingPopup
        isOpen={showYourRanking}
        onClose={handleCloseYourRanking}
      />
    </>
  )
})
