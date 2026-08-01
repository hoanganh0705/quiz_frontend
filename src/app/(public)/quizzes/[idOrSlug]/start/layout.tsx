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
    title: quiz ? `Start ${quiz.title} | QuizHub` : 'Start Quiz | QuizHub',
    description: quiz
      ? `Start playing ${quiz.title} and test your knowledge.`
      : 'Start your quiz challenge on QuizHub.',
    path: `/quizzes/${idOrSlug}/start`
  })
}

export default function QuizStartLayout({ children }: { children: ReactNode }) {
  return children
}
