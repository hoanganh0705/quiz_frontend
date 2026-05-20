import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const quiz = quizzes.find((item) => item.id === id)

  return buildMetadata({
    title: quiz ? `Start ${quiz.title} | QuizHub` : 'Start Quiz | QuizHub',
    description: quiz
      ? `Start playing ${quiz.title} and test your knowledge.`
      : 'Start your quiz challenge on QuizHub.',
    path: `/quizzes/${id}/start`
  })
}

export default function QuizStartLayout({ children }: { children: ReactNode }) {
  return children
}
