// Re-export quiz types from shared location
export { BADGE_TYPES } from './badges'
export type { BadgeType } from './badges'
import type { BadgeType } from './badges'

// Leaderboard-specific types
export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  score: number
  time?: string
  badge?: BadgeType
  rank: number
  badgeColor?: string
  borderColor?: string
  rankBgColor?: string
  rankTextColor?: string
  stars?: number
}
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
