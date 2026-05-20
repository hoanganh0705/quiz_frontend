import { Badge } from '@/components/ui/badge'
import { difficultyColors } from '@/features/quizzes/constants/difficultyColor'

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
    difficultyColors[difficulty as keyof typeof difficultyColors]?.bg ||
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
