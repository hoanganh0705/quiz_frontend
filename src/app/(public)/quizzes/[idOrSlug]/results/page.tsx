import { QuizResults } from '@/features/quizzes/components/QuizPlayer'
import type { Quiz } from '@/features/quizzes/types'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'
import Link from 'next/link'

export default async function QuizResultsPage({
  params
}: {
  params: Promise<{ idOrSlug: string }>
}) {
  const { idOrSlug } = await params
  const quiz = quizzes.find((q) => q.id === idOrSlug)

  if (!quiz) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold'>Quiz not found</h1>
          <p className='text-muted-foreground mb-6'>
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
  return <QuizResults quiz={quiz as unknown as Quiz} />
}
