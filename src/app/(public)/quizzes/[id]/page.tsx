import { QuizDetail } from '@/features/quizzes/components/QuizPlayer'
import { getQuizBySlug, listQuizVersions } from '@/features/quizzes/api'
import Link from 'next/link'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const quiz = await getQuizBySlug(id)

    return buildMetadata({
      title: `${quiz.title} | QuizHub`,
      description: quiz.description ?? undefined,
      path: `/quizzes/${id}`
    })
  } catch {
    return buildMetadata({
      title: 'Quiz not found | QuizHub',
      description: 'This quiz is unavailable.',
      path: `/quizzes/${id}`
    })
  }
}

export default async function QuizDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let quiz = null
  let publishedVersion = null

  try {
    quiz = await getQuizBySlug(id)

    // Fetch the published version
    if (quiz.publishedVersionId) {
      const versions = await listQuizVersions(quiz.quizId)
      publishedVersion = versions.items.find(v => v.quizVersionId === quiz.publishedVersionId)
    }
  } catch {
    // Quiz not found
  }

  if (!quiz) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold'>Can not find this quiz</h1>
          <p className='text-muted-foreground mb-6'>Quiz is unavailable</p>
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

  return <QuizDetail quiz={quiz} version={publishedVersion ?? undefined} />
}
