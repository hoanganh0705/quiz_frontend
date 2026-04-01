export const BADGE_TYPES = {
  DIAMOND: 'Diamond',
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze'
} as const

export type BadgeType = (typeof BADGE_TYPES)[keyof typeof BADGE_TYPES]

export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  score: number
  time?: string
  badge: BadgeType
  rank?: number
  badgeColor?: string
  borderColor?: string
  rankBgColor?: string
  rankTextColor?: string
  stars?: number
}
