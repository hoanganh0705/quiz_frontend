export interface Player {
  id: string
  rank: number
  avatarUrl?: string
  name: string
  country: string
  flag?: string
  streak?: number
  score?: number
  level?: number
  levelString?: string
  quizzes?: number
  quizzesCreated?: number
  wins?: number
  badge?: 'Diamond' | 'Platinum' | 'Gold'
  earned?: number
  followers?: string
  following?: string
  bgImageUrl?: string
  bio?: string
}
