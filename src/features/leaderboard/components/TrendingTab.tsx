'use client'

/**
 * `TrendingTab` — top-movers list from the live wire shape.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHighlights` → Trending tab.
 *
 * Renders `TopMoverDto[]` from `rankingControllerGetTopMovers()`. The
 * wire shape carries:
 *   - `userId`
 *   - `username` (the public, `@`-prefixed handle)
 *   - `currentRank`
 *   - `previousRank`
 *   - `change` (positive — the previous - current)
 *
 * Note that the API does NOT carry `avatarUrl`, `xp`, `badges`,
 * `streak`, `winRate`, `quizzesCompleted`, `isOnline`, or
 * `lastActive`. The previous mock tabs rendered all of those;
 * they're intentionally absent here. Display names for the movers
 * fall back to the `username` (since the wire only exposes the
 * public handle) — if a real display name is needed we'd have to
 * hit `/users/:id`, out of scope for this surface.
 *
 * @see `useTopMovers` for the read contract.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import type { TopMoverDto } from '@/lib/api/generated/schemas'

interface TrendingTabProps {
  users: readonly TopMoverDto[]
  isLoading: boolean
}

export default function TrendingTab({ users, isLoading }: TrendingTabProps) {
  if (isLoading) return null

  if (users.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2 mb-4'>
          <TrendingUp className='w-5 h-5 text-green-400' />
          <h3 className='text-foreground font-semibold'>Trending This Week</h3>
        </div>
        <p className='text-sm text-foreground-secondary text-center py-8'>
          No movers yet — check back after the next ranking snapshot.
        </p>
      </div>
    )
  }

  const topChange = users.reduce((max, u) => Math.max(max, u.change), 0)
  const moversCount = users.length

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 mb-4'>
        <TrendingUp className='w-5 h-5 text-green-400' />
        <h3 className='text-foreground font-semibold'>Trending This Week</h3>
      </div>
      <div className='space-y-3'>
        {users.map((user) => (
          <div
            key={user.userId}
            className='flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-primary/20 transition-colors'
          >
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h4 className='text-foreground font-semibold'>
                  {user.username}
                </h4>
              </div>
              <p className='text-foreground/80 text-sm'>
                Rank #{user.currentRank} (was #{user.previousRank})
              </p>
            </div>
            <div className='text-right'>
              <div className='flex items-center gap-1 text-xs'>
                {user.change > 0 ? (
                  <TrendingUp className='w-3 h-3 text-green-400' />
                ) : user.change < 0 ? (
                  <TrendingDown className='w-3 h-3 text-red-400' />
                ) : (
                  <Minus className='w-3 h-3 text-slate-400' />
                )}
                <span
                  className={
                    user.change > 0
                      ? 'text-green-400'
                      : user.change < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                  }
                >
                  {user.change > 0
                    ? `+${user.change}`
                    : user.change.toString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mt-6'>
        <div className='bg-muted p-3 rounded-lg text-center'>
          <div className='flex items-center justify-center mb-2'>
            <TrendingUp className='w-4 h-4 text-green-400' />
          </div>
          <p className='text-lg font-bold text-foreground'>+{topChange}</p>
          <p className='text-xs text-foreground/80'>Biggest Gain</p>
        </div>
        <div className='bg-muted p-3 rounded-lg text-center'>
          <p className='text-lg font-bold text-foreground'>{moversCount}</p>
          <p className='text-xs text-foreground/80'>Movers This Week</p>
        </div>
        <div className='bg-muted p-3 rounded-lg text-center'>
          <p className='text-lg font-bold text-foreground'>
            {Math.round(users.reduce((sum, u) => sum + u.change, 0))}
          </p>
          <p className='text-xs text-foreground/80'>Net Movement</p>
        </div>
      </div>
    </div>
  )
}
