'use client'

import type React from 'react'
import Image from 'next/image'
import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { useHomeBundle } from '@/features/quizzes/hooks/useHomeBundle'
import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'
import { TextSkeleton } from '@/components/ui/loading-states/Skeletons'

/**
 * `TopPlayersRail` — Phase 4.3 (F-7) replacement for the deleted
 * `SuccessStoriesCarousel`. The carousel previously rendered fictional
 * testimonials hardcoded in `marketing/constants/testimonialData.ts`;
 * the rail renders the real `topPlayers` payload from the home bundle
 * endpoint (`/api/v1/home/bundle`) — top 5 weekly leaderboard entries,
 * ordered by rank.
 *
 * Honest data only. No fake testimonials.
 */

const TOP_N = 5

function CardSkeleton(): React.ReactElement {
  return (
    <div
      className='flex items-center gap-4 bg-main border border-border rounded-xl p-4 min-w-[260px]'
      data-testid='top-players-rail-skeleton-card'
    >
      <TextSkeleton lines={1} className='w-8' />
      <TextSkeleton lines={1} className='w-12 h-12 rounded-full' />
      <div className='flex-1 space-y-2'>
        <TextSkeleton lines={1} className='w-24' />
        <TextSkeleton lines={1} className='w-16' />
      </div>
    </div>
  )
}

function PlayerCard({
  entry,
  place,
}: {
  entry: LeaderboardEntryDto
  place: number
}): React.ReactElement {
  return (
    <div
      className='flex items-center gap-4 bg-main border border-border rounded-xl p-4 min-w-[260px]'
      data-testid='top-players-rail-card'
    >
      <span
        className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold text-foreground shrink-0'
        aria-label={`Rank ${entry.rank}`}
      >
        {place}
      </span>
      <span
        className='relative inline-flex w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0'
        aria-hidden='true'
      >
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt={entry.displayName}
            width={48}
            height={48}
            className='object-cover'
          />
        ) : (
          <span className='inline-flex items-center justify-center w-full h-full text-sm font-semibold text-foreground'>
            {entry.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold text-foreground truncate'>
          {entry.displayName}
        </p>
        <p className='text-xs text-muted-foreground'>{entry.xp.toLocaleString()} XP</p>
      </div>
    </div>
  )
}

export function TopPlayersRail(): React.ReactElement {
  const { topPlayers, isLoading, error } = useHomeBundle()

  const topN = useMemo(() => topPlayers.slice(0, TOP_N), [topPlayers])

  return (
    <section
      className='w-full py-12 mt-10 rounded-xl text-foreground bg-main'
      role='region'
      aria-label='Top players this week'
      data-testid='top-players-rail'
    >
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col items-center justify-center space-y-4 text-center'>
          <div className='space-y-2'>
            <div className='inline-flex items-center gap-2 rounded-lg bg-main px-3 py-1 text-sm text-foreground border border-border'>
              <Trophy className='h-4 w-4 text-yellow-500' aria-hidden='true' />
              This week&apos;s top players
            </div>
            <h2 className='text-3xl font-bold text-foreground mb-4'>
              Leading the pack
            </h2>
            <p className='text-foreground/80 text-lg max-w-2xl mx-auto'>
              The top {TOP_N} players from this week&apos;s leaderboard, ranked by
              experience points earned.
            </p>
          </div>
        </div>

        {error && !isLoading && (
          <div
            className='mt-10 text-center text-destructive text-sm font-medium'
            role='alert'
            data-testid='top-players-rail-error'
          >
            Failed to load the leaderboard. Please refresh.
          </div>
        )}

        {!error && isLoading && (
          <div
            className='mt-10 grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto pb-2'
            data-testid='top-players-rail-skeleton'
          >
            {Array.from({ length: TOP_N }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!error && !isLoading && topN.length === 0 && (
          <div
            className='mt-10 text-center text-muted-foreground text-sm'
            data-testid='top-players-rail-empty'
          >
            No leaderboard data available yet.
          </div>
        )}

        {!error && !isLoading && topN.length > 0 && (
          <div
            className='mt-10 grid grid-flow-col auto-cols-[260px] gap-4 overflow-x-auto pb-2'
            data-testid='top-players-rail-grid'
          >
            {topN.map((entry, idx) => (
              <PlayerCard key={entry.userId} entry={entry} place={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default TopPlayersRail
