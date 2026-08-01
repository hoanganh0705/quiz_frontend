import PlayQuizClient from '@/features/quizzes/components/PlayQuizClient'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'

export default async function QuizStart({
  params
}: {
  params: Promise<{ idOrSlug: string }>
}) {
  const { idOrSlug } = await params
  const quiz = quizzes.find((q) => q.id === idOrSlug)

  if (!quiz) {
    return (
      <div className='text-center mt-10 text-red-500'>Quiz không tồn tại</div>
    )
  }

  return <PlayQuizClient quiz={quiz} />
}
