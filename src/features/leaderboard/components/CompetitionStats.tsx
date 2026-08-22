'use client'

/**
 * `CompetitionStats` — live card showing the current viewer's
 * ranking profile.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `CompetitionStats`.
 *
 * The previous version hardcoded:
 *   - Active participants: `1,248`
 *   - Top Badge: `Diamond (5 users)`
 *   - Your Rank: `#42`
 *   - Next Level: `3,250 / 4,000 points`
 *   - "750 points to Gold"
 *
 * All of those numbers are now derived from the live API:
 *
 *   - Active participants: `useLeaderboardSummary().totalParticipants`
 *   - Your Rank: `useMyRanking().global.weekly.rank`
 *   - Your XP: `useMyRanking().global.weekly.xp`
 *   - XP to next rank: `useMyRanking().global.weekly.xpToNextRank`
 *   - Next-rank XP: `useMyRanking().global.weekly.nextRankXp`
 *   - Badges: `useMyRanking().badges`
 *
 * When the viewer is anonymous, the card renders a graceful "sign in
 * to see your ranking" message instead of fake numbers.
 *
 * ## Why this lives in the leaderboard feature
 *
 * The card is part of the `/leaderboard` page chrome. It is a
 * pure projection of the live ranking hooks — no extra fetches.
 */

import { memo } from 'react'
import { Card } from '@/components/ui/Card'
import { CardContent } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/Card'
import { CardTitle } from '@/components/ui/Card'
import { CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Medal, Trophy, Users, Link2 } from 'lucide-react'

import {
  getWeeklyPosition,
  getBadges,
} from '@/features/leaderboard/hooks/useMyRanking'
import { useMyRanking } from '@/features/leaderboard/hooks/useMyRanking'
import { useLeaderboardSummary } from '@/features/leaderboard/hooks/useLeaderboardSummary'
import { getRankColor } from '@/features/leaderboard/lib/leaderboard-presentation'

export const CompetitionStats = memo(function CompetitionStats() {
  const { data: myRanking, isAuthenticated } = useMyRanking()
  const { totalParticipants } = useLeaderboardSummary('weekly')

  const weekly = getWeeklyPosition(myRanking)
  const badges = getBadges(myRanking)

  if (!isAuthenticated) {
    return (
      <Card className='col-span-1 py-4 sm:py-6 bg-background border border-border rounded-xl'>
        <CardHeader>
          <CardTitle className='text-foreground text-lg sm:text-xl font-bold'>
            Competition Stats
          </CardTitle>
          <CardDescription className='text-foreground/80 text-sm'>
            Sign in to see your ranking and progress
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-2 text-sm text-foreground-secondary'>
            <Users className='w-4 h-4' aria-hidden='true' />
            <span>
              {totalParticipants !== null
                ? `${totalParticipants.toLocaleString()} active participants this week`
                : 'Active participants loading…'}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const xp = weekly?.xp ?? 0
  const xpToNext = weekly?.xpToNextRank ?? null
  const nextRankXp = weekly?.nextRankXp ?? null
  const rank = weekly?.rank ?? null

  // Progress toward the next rank, expressed as a percentage of the
  // gap between the current XP and the next-rank XP. The backend
  // already returns `xpToNextRank` (the absolute XP delta), so we
  // fall back to the next-rank XP when the delta is missing.
  const progressPercent =
    nextRankXp !== null && nextRankXp > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((xp / nextRankXp) * 100),
          ),
        )
      : 0

  const activeUserLabel = badges?.isActive
    ? 'Active player'
    : badges?.isNew
      ? 'New player (≤ 7 days)'
      : badges?.isRisingStar
        ? 'Rising star'
        : 'Inactive'

  return (
    <Card className='col-span-1 py-4 sm:py-6 bg-background border border-border rounded-xl'>
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
          <span className='text-foreground font-bold text-sm'>
            {totalParticipants !== null
              ? totalParticipants.toLocaleString()
              : '—'}
          </span>
        </div>

        {/* Top Badge */}
        <div className='flex items-center justify-between text-sm sm:text-base'>
          <span className='text-foreground/80 text-sm'>Status</span>
          <div className='flex items-center gap-2'>
            <Medal
              size={14}
              className='text-yellow-400 sm:w-5 sm:h-5'
              aria-hidden='true'
            />
            <span className='text-foreground font-medium text-sm'>
              {activeUserLabel}
            </span>
          </div>
        </div>

        <div className='space-y-3 sm:space-y-4'>
          {/* Your Rank */}
          <div className='flex items-center bg-main border border-border flex-col w-full p-3 sm:p-4 rounded-xl gap-1 sm:gap-2'>
            <div className='flex items-center justify-between w-full'>
              <div className='flex items-center gap-1 sm:gap-2'>
                <Users className='w-4 h-4 text-foreground' aria-hidden='true' />
                <span className='text-foreground/80 text-xs'>Your Rank</span>
              </div>
              <Badge
                className={`bg-default hover:bg-default-hover text-white text-xs ${rank !== null ? getRankColor(rank) : ''}`}
              >
                {rank !== null ? `#${rank}` : '—'}
              </Badge>
            </div>

            {/* Progress Info */}
            <div className='flex flex-row justify-between text-xs sm:text-sm text-foreground/80 w-full'>
              <span className='text-foreground/80 text-xs'>Next Level</span>
              <span className='text-foreground text-xs'>
                {xpToNext !== null
                  ? `${xp.toLocaleString()} / ${(xp + xpToNext).toLocaleString()} points`
                  : `${xp.toLocaleString()} XP`}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className='w-full bg-muted rounded-full h-1.5 sm:h-2 border border-border'
              role='progressbar'
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Progress to next rank'
            >
              <div
                className='bg-foreground h-1 sm:h-1.5 rounded-full'
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Next Level Info */}
            <div className='flex items-center justify-between w-full text-xs sm:text-sm'>
              <div className='flex items-center gap-1 sm:gap-2 text-foreground/80'>
                <Trophy
                  className='w-3 h-3 sm:w-4 sm:h-4 text-foreground/80'
                  aria-hidden='true'
                />
                <span className='text-foreground/80 text-xs'>
                  {weekly?.percentileLabel ?? 'Top —'}
                </span>
              </div>
              <span className='text-foreground text-xs'>
                {xpToNext !== null
                  ? `${xpToNext.toLocaleString()} points to next rank`
                  : 'No next rank'}
              </span>
            </div>

            {/* Trend */}
            {weekly?.trend && weekly.trend !== 'same' ? (
              <div className='flex items-center gap-2 text-xs text-foreground-secondary w-full pt-1 border-t border-border/40'>
                <Link2 className='w-3 h-3' aria-hidden='true' />
                <span>
                  Trend: {weekly.trend}
                  {weekly.trendAmount !== null && weekly.trendAmount !== undefined && weekly.trendAmount > 0
                    ? ` (${weekly.trendAmount} positions)`
                    : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
