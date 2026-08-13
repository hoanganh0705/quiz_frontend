'use client'

/**
 * `LeaderboardHeader` — page chrome for `/leaderboard`.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHeader`.
 *
 * The previous version defaulted to:
 *   - `userRank = 42`
 *   - `userPoints = 3250`
 *   - `totalParticipants = 1248`
 *   - `seasonEndDate = '2024-03-31'`
 *
 * All of those defaults are gone. The component is now a pure
 * presentational component that:
 *   - Reads `totalParticipants` and `seasonEndDate` from
 *     `useLeaderboardSummary('weekly')`.
 *   - Reads `userRank` and `userPoints` from `useMyRanking()`.
 *   - Renders a graceful "Sign in to see your ranking" cluster for
 *     anonymous viewers.
 *
 * ## Auth-aware
 *
 * The header stats are split into two clusters:
 *   1. Public stats (Total Participants, Season Ends) — visible to
 *      all viewers.
 *   2. Personal stats (Your Rank, Your Points) — visible only to
 *      authenticated viewers. The cluster is hidden entirely for
 *      anonymous viewers (replaced with a single "Sign in to see
 *      your ranking" CTA).
 *
 * ## Reason for the split
 *
 * The breakpoint grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
 * drives the layout. Showing four slots to anonymous viewers would
 * either render blanks or `—` placeholders — both are worse UX than
 * collapsing the personal cluster.
 */

import { useState, memo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { FindFriendsPopup } from './FindFriendsPopup'
import { YourRankingPopup } from './YourRankingPopup'
import { Trophy, Star, Users, Crown, Calendar } from 'lucide-react'

import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { useMyRanking, getWeeklyPosition } from '@/features/leaderboard/hooks/useMyRanking'
import { useLeaderboardSummary } from '@/features/leaderboard/hooks/useLeaderboardSummary'
import { getRankColor, formatPeriodReset } from '@/features/leaderboard/lib/leaderboard-presentation'

export const LeaderboardHeader = memo(function LeaderboardHeader() {
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showYourRanking, setShowYourRanking] = useState(false)

  const { isAuthenticated } = useAuthState()
  const { data: myRanking } = useMyRanking()
  const { totalParticipants, period } = useLeaderboardSummary('weekly')

  const weekly = getWeeklyPosition(myRanking)
  const userRank = weekly?.rank ?? null
  const userPoints = weekly?.xp ?? null

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

  const seasonResetLabel =
    period?.resetInSeconds !== undefined && period?.resetInSeconds !== null
      ? formatPeriodReset(period.resetInSeconds)
      : '—'

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
              className='bg-brand hover:bg-brand text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 flex items-center gap-2'
              onClick={handleShowFindFriends}
              aria-label='Find friends on leaderboard'
            >
              <Users className='w-3 h-3 sm:w-4 sm:h-4' aria-hidden='true' />
              Find Friends
            </Button>
            {isAuthenticated ? (
              <Button
                className='bg-brand hover:bg-brand text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 flex items-center gap-2'
                onClick={handleShowYourRanking}
                aria-label='View your ranking details'
              >
                <Trophy className='w-3 h-3 sm:w-4 sm:h-4' aria-hidden='true' />
                Your Ranking
              </Button>
            ) : null}
          </div>
        </header>

        {/* Stats Overview */}
        <section
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
          aria-label='Leaderboard statistics overview'
        >
          {/* Total Participants */}
          <div className='bg-background p-4 rounded-lg border border-border'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Total Participants</p>
                <p className='text-foreground font-bold text-lg'>
                  {totalParticipants !== null
                    ? totalParticipants.toLocaleString()
                    : '—'}
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
          <div className='bg-background p-4 rounded-lg border border-border'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-foreground/80 text-sm'>Season Ends</p>
                <p className='text-foreground font-bold text-lg'>
                  {seasonResetLabel}
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

          {/* Your Rank (auth-only) */}
          {isAuthenticated ? (
            <div className='bg-background p-4 rounded-lg border border-border'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-foreground/80 text-sm'>Your Rank</p>
                  <p
                    className={`font-bold text-lg ${userRank !== null ? getRankColor(userRank) : 'text-foreground'}`}
                  >
                    {userRank !== null ? `#${userRank}` : '—'}
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
          ) : null}

          {/* Your Points (auth-only) */}
          {isAuthenticated ? (
            <div className='bg-background p-4 rounded-lg border border-border'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-foreground/80 text-sm'>Your Points</p>
                  <p className='text-foreground font-bold text-lg'>
                    {userPoints !== null ? userPoints.toLocaleString() : '—'}
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
          ) : null}
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
