import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ idOrSlug: string }>
}): Promise<Metadata> {
  const { idOrSlug } = await params
  const quiz = quizzes.find((item) => item.id === idOrSlug)

  return buildMetadata({
    title: quiz ? `${quiz.title} Results | QuizHub` : 'Quiz Results | QuizHub',
    description: quiz
      ? `View your score and detailed performance for ${quiz.title}.`
      : 'View your quiz score and detailed performance.',
    path: `/quizzes/${idOrSlug}/results`
  })
}

export default function QuizResultsLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
