import { Quiz } from './quiz'

export interface QuizResult {
answers: Record<number, string>
timeTaken: number
completedAt: number
score: number
correctCount: number
incorrectCount: number
timePerQuestion: Record<number, number>
}

export interface QuizProgress {
currentQuestion: number
answers: Record<number, string>
timeLeft: number
timerStarted: boolean
startedAt: number | null
timePerQuestion: Record<number, number>
questionStartTime: number | null
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
avgTimePerQuestion: number
}

export interface LeaderboardTabProps {
quiz: Quiz
result: QuizResult
}

export interface ShareResultsTabProps {
quiz: Quiz
result: QuizResult
copied: boolean
onCopyLink: () => void
onShare: (platform: string) => void
}

export interface TimeAnalysisProps {
questionReviews: QuestionReview[]
avgTimePerQuestion: number
}

export interface BottomActionsProps {
quizId: string
onPlayAgain: () => void
}

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
