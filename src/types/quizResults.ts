import { Quiz } from '@/types/quiz'

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
