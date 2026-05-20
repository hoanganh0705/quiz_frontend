// Quiz History / Activity Types

export type QuizActivityType =
  | 'completed'
  | 'abandoned'
  | 'started'
  | 'achievement'
  | 'streak'

export type QuizResultStatus = 'passed' | 'failed' | 'abandoned'

export type DateRangeFilter =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | '3months'
  | 'year'

export type SortOption = 'newest' | 'oldest' | 'highest-score' | 'lowest-score'

export interface QuizHistoryEntry {
  id: string
  quizId: string
  quizTitle: string
  category: string
  categoryIcon: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  score: number
  totalQuestions: number
  correctAnswers: number
  timeTaken: number // in seconds
  completedAt: string // ISO date string
  status: QuizResultStatus
  activityType: QuizActivityType
  xpEarned: number
  streak?: number
  rank?: number
  totalParticipants?: number
  tags: string[]
}

export interface QuizHistoryStats {
  totalQuizzes: number
  totalCorrectAnswers: number
  totalQuestions: number
  averageScore: number
  bestScore: number
  totalTimePlayed: number // in seconds
  currentStreak: number
  longestStreak: number
  totalXpEarned: number
  quizzesThisWeek: number
  quizzesThisMonth: number
  categoryBreakdown: CategoryStat[]
  difficultyBreakdown: DifficultyBreakdown
  weeklyActivity: WeeklyActivity[]
  monthlyScoreTrend: MonthlyScoreTrend[]
}

export interface CategoryStat {
  category: string
  icon: string
  count: number
  averageScore: number
  bestScore: number
  totalTime: number
  color: string
}

export interface DifficultyBreakdown {
  easy: { count: number; avgScore: number }
  medium: { count: number; avgScore: number }
  hard: { count: number; avgScore: number }
}

export interface WeeklyActivity {
  day: string
  quizzes: number
  avgScore: number
}

export interface MonthlyScoreTrend {
  month: string
  avgScore: number
  quizCount: number
}

export interface QuizHistoryFilters {
  dateRange: DateRangeFilter
  category: string
  status: QuizResultStatus | 'all'
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'all'
  sort: SortOption
  search: string
}

export type ExportFormat = 'csv' | 'json'
