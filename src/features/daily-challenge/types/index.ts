// Daily challenge types - public API surface
export interface ChallengeData {
  id: string
  date: string
  category: string
  score: number
  rank: number
  isTopTen: boolean
}

export interface StreakReward {
  days: number
  reward: string
}

export interface Badge {
  id: string
  name: string
  icon: React.ReactNode
  bgColor: string
  color: string
  unlocked: boolean
}

export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  badge: string
  score: number
  time: string
}
