import QuizResults from '@/components/quiz-page/QuizResults'
import { quizzes } from '@/constants/mockQuizzes'
import Link from 'next/link'

export default async function QuizResultsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quiz = quizzes.find((q) => q.id === id)

  if (!quiz) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold'>Quiz not found</h1>
          <p className='text-slate-400 mb-6'>
            The quiz you&apos;re looking for doesn&apos;t exist
          </p>
          <Link
            href='/quizzes'
            className='bg-default hover:bg-default-hover text-white px-6 py-2 rounded-lg transition'
          >
            Back to Explore Quizzes
          </Link>
        </div>
      </div>
    )
  }

  return <QuizResults quiz={quiz} />
}
