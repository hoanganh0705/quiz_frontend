// Re-export quiz types from shared location
export type { Quiz } from '@/types/quiz'
export type { LeaderboardEntry, BadgeType } from '@/types/leaderboard'

// Leaderboard-specific types
export interface LeaderboardUser {
  id: string
  rank: number
  name: string
  username: string
  points: number
  avatar: string
  badge: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
  badgeColor: string
  borderColor: string
  rankBgColor: string
  rankTextColor: string
  stars: number
  streak: number
  quizzesCompleted: number
  winRate: number
  change: number
  category?: string
  isOnline?: boolean
  lastActive?: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  totalUsers: number
}

export type TimePeriod = 'all-time' | 'monthly' | 'weekly' | 'daily'
export type ActiveTab = 'global' | 'category' | 'trending'
