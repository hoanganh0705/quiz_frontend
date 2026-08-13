'use client'

/**
 * `GlobalTab` — top-3 podium + summary stats derived from the
 * live `/leaderboard` wire shape.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHighlights` → Global tab.
 *
 * The component renders only the fields the API actually exposes:
 *   - `rank` (ordinal, ties shown)
 *   - `displayName`
 *   - `avatarUrl`
 *   - `xp`
 *   - `isTied` (renders a "Tied" footnote below the podium)
 *
 * The previous mock-data tab rendered fields the API never carried
 * (`winRate`, `quizzesCompleted`, `streak`, `stars`, `badge`,
 * `username`, `lastActive`, `isOnline`). Those were removed in this
 * ticket; the wire shape is the single source of truth.
 *
 * ## Top-3 podium
 *
 * The podium shows the first three ranked entries. Tied entries
 * share a rank — the visual order matches the array order returned
 * by the API (which always orders by rank asc, then xp desc).
 *
 * ## Stats strip
 *
 * The four-tile stats strip underneath the podium is intentionally
 * minimal: the only aggregate the wire exposes per-entry is `xp`.
 * The tile content is the average XP of the top-3, the median XP,
 * the top XP, and the entry count. (The previous mock tabs claimed
 * "Top Win Rate", "Most Quizzes", "Longest Streak", "Top Rating" —
 * none of which the API exposes; those tiles are now an honest
 * visualisation of the XP distribution.)
 *
 * @see `useLeaderboard` for the entry type contract.
 */

import Image from 'next/image'

import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'

interface GlobalTabProps {
  users: readonly LeaderboardEntryDto[]
  isLoading: boolean
}

export default function GlobalTab({ users, isLoading }: GlobalTabProps) {
  if (isLoading) return null

  const top = users.slice(0, 3)
  const second = top[1]
  const first = top[0]
  const third = top[2]

  // Aggregate stats — driven by the wire shape only.
  const xpValues = top.map((u) => u.xp)
  const topXp = xpValues.length > 0 ? Math.max(...xpValues) : 0
  const avgXp =
    xpValues.length > 0
      ? Math.round(xpValues.reduce((a, b) => a + b, 0) / xpValues.length)
      : 0
  const medianXp = computeMedian(xpValues)

  return (
    <div className='space-y-4 mb-20'>
      <div className='relative'>
        <div className='flex items-end justify-center gap-4 mb-8'>
          {/* Second Place */}
          {second ? (
            <div className='flex flex-col items-center'>
              <div className='relative mb-3'>
                <div className='w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#d1d5db] ring-offset-2 ring-offset-main'>
                  <Image
                    src={second.avatarUrl || '/placeholder.svg'}
                    alt={second.displayName}
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
                {second.displayName}
              </h3>
              <p className='text-foreground/80 text-sm mb-2'>
                {second.xp.toLocaleString()} XP
              </p>
              {second.isTied ? (
                <span className='text-xs text-foreground/60 mb-2'>Tied</span>
              ) : null}
              <div className='bg-muted rounded-lg p-4 w-32 h-24'></div>
            </div>
          ) : null}

          {/* First Place */}
          {first ? (
            <div className='flex flex-col items-center -mt-8'>
              <div className='relative mb-3'>
                <div className='w-24 h-24 rounded-full overflow-hidden ring-2 ring-yellow-400 dark:ring-yellow-500 ring-offset-2 ring-offset-main'>
                  <Image
                    src={first.avatarUrl || '/placeholder.svg'}
                    alt={first.displayName}
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
                {first.displayName}
              </h3>
              <p className='text-foreground/80 text-base mb-2'>
                {first.xp.toLocaleString()} XP
              </p>
              {first.isTied ? (
                <span className='text-xs text-foreground/60 mb-2'>Tied</span>
              ) : null}
              <div className='bg-muted rounded-lg p-4 w-36 h-32'></div>
            </div>
          ) : null}

          {/* Third Place */}
          {third ? (
            <div className='flex flex-col items-center'>
              <div className='relative mb-3'>
                <div className='w-20 h-20 rounded-full overflow-hidden ring-2 ring-orange-500 dark:ring-orange-600 ring-offset-2 ring-offset-main'>
                  <Image
                    src={third.avatarUrl || '/placeholder.svg'}
                    alt={third.displayName}
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
                {third.displayName}
              </h3>
              <p className='text-foreground/80 text-sm mb-2'>
                {third.xp.toLocaleString()} XP
              </p>
              {third.isTied ? (
                <span className='text-xs text-foreground/60 mb-2'>Tied</span>
              ) : null}
              <div className='bg-muted rounded-lg p-4 w-32 h-20'></div>
            </div>
          ) : null}
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {topXp.toLocaleString()}
            </p>
            <p className='text-xs text-foreground/80'>Top XP</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {avgXp.toLocaleString()}
            </p>
            <p className='text-xs text-foreground/80'>Avg XP (top 3)</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {medianXp.toLocaleString()}
            </p>
            <p className='text-xs text-foreground/80'>Median XP</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>{top.length}</p>
            <p className='text-xs text-foreground/80'>Podium Entries</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }
  return sorted[mid]
}
