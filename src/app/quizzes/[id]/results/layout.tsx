import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { quizzes } from '@/constants/mockQuizzes'
import { buildMetadata } from '@/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const quiz = quizzes.find((item) => item.id === id)

  return buildMetadata({
    title: quiz ? `${quiz.title} Results | QuizHub` : 'Quiz Results | QuizHub',
    description: quiz
      ? `View your score and detailed performance for ${quiz.title}.`
      : 'View your quiz score and detailed performance.',
    path: `/quizzes/${id}/results`
  })
}

export default function QuizResultsLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
