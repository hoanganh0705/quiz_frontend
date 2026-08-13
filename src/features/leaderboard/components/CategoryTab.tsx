'use client'

/**
 * `CategoryTab` — top-3 podium for the "By Category" leaderboard
 * tab.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `LeaderboardHighlights` → Category tab.
 *
 * ## Scope note
 *
 * The ranking API does NOT expose per-category leaderboards. The
 * `LeaderboardResponseDto` returns a single list per period; per-
 * category slicing is not part of the `GET /leaderboard` wire
 * shape (see `rankingControllerGetGlobalLeaderboard` in
 * `lib/api/generated/leaderboards/leaderboards.ts`).
 *
 * To avoid silently dropping the tab (which would break the
 * `LeaderboardHighlights` tab navigation) and to avoid rendering
 * hardcoded mock data, the tab renders the global top-3 with a
 * "All categories" badge so the viewer understands what they're
 * seeing. If a per-category endpoint ships later, this is the
 * single place to swap the fetcher.
 *
 * @see `useLeaderboard` for the entry type contract.
 */

import Image from 'next/image'

import type { LeaderboardEntryDto } from '@/lib/api/generated/schemas'

interface CategoryTabProps {
  users: readonly LeaderboardEntryDto[]
  isLoading: boolean
  category: string
}

export default function CategoryTab({
  users,
  isLoading,
  category,
}: CategoryTabProps) {
  if (isLoading) return null

  const top = users.slice(0, 3)
  const second = top[1]
  const first = top[0]
  const third = top[2]

  return (
    <div className='space-y-4 mb-20'>
      <div className='flex justify-center'>
        <span className='inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-foreground/80'>
          {category === 'all' ? 'All categories' : category}
        </span>
      </div>
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
              <div className='bg-muted rounded-lg p-4 w-32 h-20 text-white'></div>
            </div>
          ) : null}
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {first?.xp.toLocaleString() ?? '0'}
            </p>
            <p className='text-xs text-foreground/80'>Top XP</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>{top.length}</p>
            <p className='text-xs text-foreground/80'>On the podium</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {second?.xp.toLocaleString() ?? '0'}
            </p>
            <p className='text-xs text-foreground/80'>2nd XP</p>
          </div>
          <div className='bg-muted p-3 rounded-lg text-center'>
            <p className='text-lg font-bold text-foreground'>
              {third?.xp.toLocaleString() ?? '0'}
            </p>
            <p className='text-xs text-foreground/80'>3rd XP</p>
          </div>
        </div>
      </div>
    </div>
  )
}
