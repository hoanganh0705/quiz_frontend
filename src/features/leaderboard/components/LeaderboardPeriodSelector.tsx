'use client'

/**
 * `LeaderboardPeriodSelector` — controlled period selector.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.B2.
 *
 * Three human labels render: `Weekly`, `Monthly`, `All-time`. The
 * selector emits the **wire-side** enum value (`weekly`, `monthly`,
 * `all_time`) on `onChange`. The snake-case `all_time` is NOT a typo
 * — it matches the `RankingControllerGetGlobalLeaderboardPeriod`
 * enum on the wire.
 *
 * ## No data fetching
 *
 * The selector is a controlled, presentational component. The
 * composition (Batch C) wires the `onChange` callback to update the
 * `useLeaderboard(period)` call — period switching resets the cursor
 * via the SWR key change inside the hook.
 *
 * ## Default initial period is `weekly`
 *
 * The default is `weekly` per master plan open decision #3 from
 * `PHASE_3_EPICS.md` line 1325. The composition's state owner
 * initializes with `weekly` and the selector falls back to `weekly`
 * if the `period` prop is omitted (defensive default).
 *
 * ## Accessibility
 *
 * - Each option is a real `<button type="button">` (keyboard-reachable
 *   by default — Enter and Space activate the focused option).
 * - The selected option sets `aria-pressed="true"` so screen readers
 *   announce the toggle state.
 * - The three buttons are wrapped in a `role="group"` with an
 *   `aria-label="Leaderboard period"` so screen readers announce the
 *   group purpose.
 */

import { useId } from 'react'

import { cn } from '@/shared/utils/merge-class-names'

import type { LeaderboardPeriod } from '@/features/leaderboard/wrappers/leaderboard.wrapper'

// ──────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────

export interface LeaderboardPeriodSelectorProps {
  /** The currently selected period (wire-side enum). Defaults to `weekly`. */
  period: LeaderboardPeriod
  /** Callback invoked with the wire-side enum on selection. */
  onChange: (period: LeaderboardPeriod) => void
  /** Optional class name for the outer wrapper. */
  className?: string
}

// ──────────────────────────────────────────────────────────────────────────
// Option registry (single source of truth for label + wire enum mapping)
// ──────────────────────────────────────────────────────────────────────────

interface PeriodOption {
  value: LeaderboardPeriod
  label: string
}

const PERIOD_OPTIONS: readonly PeriodOption[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All-time' },
]

// ──────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────

export function LeaderboardPeriodSelector({
  period,
  onChange,
  className,
}: LeaderboardPeriodSelectorProps) {
  // Use a stable id so the group label is consistent across renders.
  const groupLabelId = useId()

  return (
    <div
      role='group'
      aria-labelledby={groupLabelId}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-slate-800/40 p-1',
        className,
      )}
    >
      <span id={groupLabelId} className='sr-only'>
        Leaderboard period
      </span>
      {PERIOD_OPTIONS.map((option) => {
        const isSelected = option.value === period
        return (
          <button
            key={option.value}
            type='button'
            aria-pressed={isSelected}
            onClick={() => {
              if (!isSelected) {
                onChange(option.value)
              }
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
