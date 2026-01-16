export interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  questionCount: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  image: string
  currentPlayers: number
  players: number
  maxPlayers: number
  requirements: string
  tags: string[]
  categories: string[]
  isPopular: boolean
  isFeatured: boolean
  rating: number
  creator: {
    userId: number
    username: string
    name: string
    position: string
    imageURL: string
    quizzesCreated: number
    rating: number
  }
  createdAt: string
  updatedAt: string
  questions: {
    id: number
    question: string
    image: string
    answers: { label: string; value: string }[]
    correctAnswer: string
  }[]
  quizReview: {
    userId: number
    username: string
    rating: number
    comment: string
    date: string
  }[]
  leaderBoard: {
    userId: number
    username: string
    score: number | string
    rank: number
    completedAt: string
    avatar?: string
    time: string
  }[]
  badges: string[]
  timeLeft?: number
  reward: number
  spots: number
  spotsLeft: number
  bgGradient: string
  almostFull?: boolean
  authorAvatarSrc: string
  authorName: string
}
