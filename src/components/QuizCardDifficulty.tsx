import type { QuizDifficulty } from '@/types/quiz'
import QuizCardUnified from '@/components/QuizCardUnified'

export interface QuizCardProps {
  id?: string
  imageSrc: string
  difficulty: QuizDifficulty
  creatorImageURL: string
  creatorName: string
  reward: number
  category: string
  duration: number
  title: string
  currentPlayers: number
  spotsAvailable: number
  maxPlayers: number
}

export function QuizCardDifficulty({
  id,
  imageSrc,
  difficulty,
  creatorImageURL,
  creatorName,
  reward,
  category,
  duration,
  title,
  currentPlayers,
  spotsAvailable,
  maxPlayers
}: QuizCardProps) {
  return (
    <QuizCardUnified
      variant='difficulty'
      id={id}
      imageSrc={imageSrc}
      difficulty={difficulty}
      creatorImageURL={creatorImageURL}
      creatorName={creatorName}
      reward={reward}
      category={category}
      duration={duration}
      title={title}
      currentPlayers={currentPlayers}
      spotsAvailable={spotsAvailable}
      maxPlayers={maxPlayers}
    />
  )
}
