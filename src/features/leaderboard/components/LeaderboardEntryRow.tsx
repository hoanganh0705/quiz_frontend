'use client'

/**
 * `LeaderboardEntryRow` — live row for a single leaderboard entry.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B3.
 *
 * Renders one `LeaderboardEntryDto` from the wire: rank, dense rank,
 * avatar, display name, XP, and the self-entry highlight. The row is
 * the unit the table (Batch C) renders per item.
 *
 * ## Self-entry highlight (drift A1 #3)
 *
 * The self-entry highlight is driven by `entry.isCurrentUser === true`.
 * When `isCurrentUser` is `true`, the row has a visible background
 * tint AND `aria-current="true"`. When `isCurrentUser` is `false`,
 * `null`, or `undefined`, the highlight is **absent**.
 *
 * The `isAuthenticated` prop is the gate that decides whether the
 * row CAN tell whether the entry is the current user. When
 * `isAuthenticated === false`, the row cannot highlight itself —
 * the `userPosition` field on the public variant of the SDK is
 * always `null` per the SDK comment at
 * `leaderboards.ts` line 47 (drift capture #3 in A1). The composition
 * passes `isAuthenticated` from `useAuthState()`.
 *
 * ## No rank-change indicator (drift A1 #2)
 *
 * The row does NOT render a rank-change indicator. The
 * `LeaderboardEntryDto` does not expose `rankChange` / `previousRank`
 * — the only rank-change surface is the authenticated
 * `/leaderboard/me/movement` endpoint, which is out of scope for
 * Story 3.11 (the public read-only render).
 *
 * ## XP formatting
 *
 * XP is rendered with thousands separators via `xp.toLocaleString()`.
 * No decimal places are added — XP is always an integer.
 *
 * ## Keyboard reachability
 *
 * The row is a `<div>` (non-interactive). If the consumer wants a
 * clickable row, the composition wraps the row in a `<Link>` or adds
 * an `onClick` handler at a parent level. The row itself does NOT
 * add `role="button"` or any interactive semantics.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { cn } from '@/shared/utils/merge-class-names'

import type { LeaderboardEntryWithId } from '@/features/leaderboard/hooks/useLeaderboard'
import { getRankColor } from '@/features/leaderboard/lib/leaderboard-presentation'

// ──────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────

export interface LeaderboardEntryRowProps {
  /** The wire entry from `useLeaderboard(period).entries`. */
  entry: LeaderboardEntryWithId
  /** Whether the current user is authenticated. Gates the self-entry highlight. */
  isAuthenticated: boolean
  /** Optional class name for the outer wrapper. */
  className?: string
}

// ──────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────

export function LeaderboardEntryRow({
  entry,
  isAuthenticated,
  className,
}: LeaderboardEntryRowProps) {
  // Self-entry highlight gate (drift A1 #3): the row can only highlight
  // the user when the request is authenticated AND the entry is flagged
  // by the backend. The `entry.isCurrentUser` field is the source of
  // truth — `userPosition` on the public variant is always `null`.
  const isSelfEntry = isAuthenticated && entry.isCurrentUser === true

  // Initial-letter fallback for the avatar. Use the first character
  // of the display name, uppercased, falling back to `?` for an
  // unexpected empty string (defensive default).
  const avatarFallbackLetter = entry.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      aria-current={isSelfEntry ? 'true' : undefined}
      data-leaderboard-row={entry.userId}
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg p-3',
        'transition-colors',
        isSelfEntry
          ? 'bg-primary/10 ring-1 ring-primary/40'
          : 'bg-slate-800/30',
        className,
      )}
    >
      {/* Left cluster: rank, dense rank, avatar, display name */}
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <div className='flex w-12 shrink-0 flex-col items-center'>
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              getRankColor(entry.rank),
            )}
            aria-label={`Rank ${entry.rank}`}
          >
            #{entry.rank}
          </span>
          <span
            className='text-xs text-slate-400 tabular-nums'
            aria-label={`Dense rank ${entry.denseRank}`}
          >
            d#{entry.denseRank}
          </span>
        </div>

        <Avatar className='h-10 w-10 shrink-0'>
          {entry.avatarUrl ? (
            <AvatarImage src={entry.avatarUrl} alt={entry.displayName} />
          ) : null}
          <AvatarFallback>{avatarFallbackLetter}</AvatarFallback>
        </Avatar>

        <div className='min-w-0 flex-1'>
          <p
            className={cn(
              'truncate text-sm font-medium',
              isSelfEntry ? 'text-primary-foreground' : 'text-white',
            )}
          >
            {entry.displayName}
            {isSelfEntry ? (
              <span className='ml-2 text-xs font-normal text-primary'>
                (you)
              </span>
            ) : null}
          </p>
          {entry.isTied ? (
            <p className='text-xs text-slate-400'>Tied</p>
          ) : null}
        </div>
      </div>

      {/* Right cluster: XP with thousands separators */}
      <div className='flex shrink-0 items-center gap-1'>
        <span
          className='rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums'
          aria-label={`${entry.xp} XP`}
        >
          {entry.xp.toLocaleString()} XP
        </span>
      </div>
    </div>
  )
}
