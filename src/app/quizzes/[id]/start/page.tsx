import PlayQuizClient from '@/components/PlayQuizClient'
import { quizzes } from '@/constants/mockQuizzes'

export default async function QuizStart({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quiz = quizzes.find((q) => q.id === id)

  if (!quiz) {
    return (
      <div className='text-center mt-10 text-red-500'>Quiz không tồn tại</div>
    )
  }

  return <PlayQuizClient quiz={quiz} />
}
