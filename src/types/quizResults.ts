import { Quiz } from '@/types/quiz'

// Core result types
export interface QuizResult {
  answers: Record<number, string>
  timeTaken: number
  completedAt: number
  score: number
  correctCount: number
  incorrectCount: number
  timePerQuestion: Record<number, number>
}

export interface QuestionReview {
  questionIndex: number
  question: string
  image: string
  userAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
  timeTaken: number
  answers: { label: string; value: string }[]
}

// Main component props
export interface QuizResultsProps {
  quiz: Quiz
}

export interface ScoreHeroProps {
  quiz: Quiz
  result: QuizResult
  percentile: number
  onPlayAgain: () => void
}

export interface StatsOverviewProps {
  result: QuizResult
  avgTimePerQuestion: number
}

export interface AnswerReviewTabProps {
  questionReviews: QuestionReview[]
  expandedQuestions: Set<number>
  onToggleQuestion: (index: number) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  avgTimePerQuestion: number
}

export interface LeaderboardTabProps {
  quiz: Quiz
  result: QuizResult
  formatTime: (seconds: number) => string
}

export interface ShareResultsTabProps {
  quiz: Quiz
  result: QuizResult
  copied: boolean
  onCopyLink: () => void
  onShare: (platform: string) => void
  formatTime: (seconds: number) => string
}

export interface TimeAnalysisProps {
  questionReviews: QuestionReview[]
  avgTimePerQuestion: number
}

export interface BottomActionsProps {
  quizId: string
  onPlayAgain: () => void
}

// Sub-component props
export interface QuestionReviewItemProps {
  review: {
    question: string
    image: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    timeTaken: number
    answers: { label: string; value: string }[]
  }
  index: number
  isExpanded: boolean
  onToggle: () => void
}

export interface LeaderboardItemProps {
  player: {
    userId: number
    username: string
    score: number | string
    completedAt: string
    avatar?: string
    time: string
  }
  rank: number
}

export interface SharePreviewProps {
  quiz: { title: string; questions: { id: number }[] }
  result: { score: number; correctCount: number; timeTaken: number }
  formatTime: (seconds: number) => string
}

export interface ShareButtonsProps {
  copied: boolean
  onCopyLink: () => void
  onShare: (platform: string) => void
}

export interface ChallengeFriendsProps {
  quizId: string
  copied: boolean
  onCopyLink: () => void
}

export interface TimeAnalysisItemProps {
  review: {
    timeTaken: number
    isCorrect: boolean
  }
  index: number
}
