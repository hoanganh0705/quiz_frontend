import { Badge } from '@/components/ui/Badge'
import { difficulty-colors } from '@/features/quizzes/constants/difficulty-color'

interface QuizCardDifficultyBadgeProps {
  difficulty: string
  className?: string
  asDiv?: boolean
}

export function QuizCardDifficultyBadge({
  difficulty,
  className = '',
  asDiv = false
}: QuizCardDifficultyBadgeProps) {
  const colorClass =
    difficulty-colors[difficulty as keyof typeof difficulty-colors]?.bg ||
    'bg-slate-500'

  if (asDiv) {
    return (
      <div
        className={`rounded-full px-3 py-1 text-xs font-semibold ${colorClass} ${className}`}
      >
        {difficulty}
      </div>
    )
  }

  return (
    <Badge className={`${colorClass} ${className}`}>
      {difficulty}
    </Badge>
  )
}
