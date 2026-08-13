import { QuizResults } from '@/features/quizzes/components/QuizPlayer'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// QuizResults needs to be a client component that fetches data
// For now, show a placeholder until the component is properly updated
export default async function QuizResultsPage({
  params
}: {
  params: Promise<{ idOrSlug: string }>
}) {
  const { idOrSlug } = await params

  // TODO: Implement proper quiz results fetching
  // For now, show a message that this page needs to be updated
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold'>Quiz Results</h1>
        <p className='text-muted-foreground mb-6'>
          Quiz ID: {idOrSlug}
        </p>
        <p className='text-muted-foreground mb-6'>
          This page needs to be updated to use the real API.
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
