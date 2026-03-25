import QuizCardUnified from '@/components/QuizCardUnified'

interface QuizCardProps {
  id: string
  title: string
  categories: string[]
  difficulty: string
  image: string
}

const QuizCard = ({
  id,
  title,
  categories,
  difficulty,
  image
}: QuizCardProps) => {
  return (
    <QuizCardUnified
      variant='compact'
      id={id}
      title={title}
      categories={categories}
      difficulty={difficulty}
      image={image}
    />
  )
}

export default QuizCard
