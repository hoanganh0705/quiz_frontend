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
