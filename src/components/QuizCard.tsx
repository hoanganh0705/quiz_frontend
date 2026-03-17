import QuizCardUnified from '@/components/QuizCardUnified'

interface QuizCardProps {
  title: string
  categories: string[]
  difficulty: string
  image: string
}

const QuizCard = ({ title, categories, difficulty, image }: QuizCardProps) => {
  return (
    <QuizCardUnified
      variant='compact'
      title={title}
      categories={categories}
      difficulty={difficulty}
      image={image}
    />
  )
}

export default QuizCard
