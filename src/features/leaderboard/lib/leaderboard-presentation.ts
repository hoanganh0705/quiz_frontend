// Leaderboard utility functions

export function getRankColor(rank: number): string {
  if (rank <= 3) return 'text-yellow-400'
  if (rank <= 10) return 'text-blue-400'
  if (rank <= 50) return 'text-green-400'
  return 'text-slate-400'
}

export function getChangeIcon(change: number): 'up' | 'down' | 'none' {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'none'
}

export function getBadgeIcon(badge: string): string {
  switch (badge) {
    case 'Diamond':
      return '💎'
    case 'Platinum':
      return '🥇'
    case 'Gold':
      return '🥈'
    case 'Silver':
      return '🥉'
    case 'Bronze':
      return '🏅'
    default:
      return '⭐'
  }
}

export function formatSeasonEndDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Season ended'
  if (diffDays === 1) return '1 day left'
  if (diffDays <= 7) return `${diffDays} days left`
  return `${diffDays} days left`
}

/**
 * Format the ranking-period reset countdown from `PeriodInfoDto`.
 *
 * The period DTO carries `resetInSeconds` (seconds until the next
 * reset). The leaderboard header renders this as a relative phrase
 * so the wire shape stays the single source of truth.
 *
 * - `null` end → "Ongoing" (matches the `all_time` period).
 * - `<= 0` seconds → "Resetting…".
 * - `< 60` seconds → "less than a minute".
 * - `< 60` minutes → "X min".
 * - `< 24` hours → "X hr".
 * - Otherwise → "X days".
 */
export function formatPeriodReset(resetInSeconds: number | null): string {
  if (resetInSeconds === null || Number.isNaN(resetInSeconds)) return '—'
  if (resetInSeconds <= 0) return 'Resetting…'
  if (resetInSeconds < 60) return 'less than a minute'
  if (resetInSeconds < 60 * 60) {
    const mins = Math.floor(resetInSeconds / 60)
    return `${mins} min`
  }
  if (resetInSeconds < 60 * 60 * 24) {
    const hours = Math.floor(resetInSeconds / (60 * 60))
    return `${hours} hr`
  }
  const days = Math.floor(resetInSeconds / (60 * 60 * 24))
  return `${days} days`
}
