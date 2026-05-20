export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface QuizCreator {
  userId: number
  username: string
  name: string
  position: string
  imageURL: string
  quizzesCreated: number
  rating: number
}

export interface QuizAnswerOption {
  label: string
  value: string
}

export interface QuizQuestion {
  id: number
  question: string
  image: string
  answers: QuizAnswerOption[]
  correctAnswer: string
}

export interface QuizReview {
  userId: number
  username: string
  rating: number
  comment: string
  date: string
}

export interface QuizLeaderboardEntry {
  userId: number
  username: string
  score: number
  rank: number
  completedAt: string
  avatar?: string
  time: string
}

export interface QuizMetadata {
  id: string
  title: string
  description: string
  duration: number
  questionCount: number
  difficulty: QuizDifficulty
  image: string
  currentPlayers: number
  maxPlayers: number
  requirements: string
  tags: string[]
  categories: string[]
  isPopular: boolean
  isFeatured: boolean
  rating: number
  creator: QuizCreator
  createdAt: string
  updatedAt: string
  badges: string[]
  timeLeft?: number
  reward: number
  spotsLeft: number
  bgGradient: string
  almostFull?: boolean
}

export interface Quiz extends QuizMetadata {
  questions: QuizQuestion[]
  quizReview: QuizReview[]
  leaderBoard: QuizLeaderboardEntry[]
}
