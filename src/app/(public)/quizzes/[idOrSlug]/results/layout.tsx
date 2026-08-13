import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ idOrSlug: string }>
}): Promise<Metadata> {
  const { idOrSlug } = await params

  return buildMetadata({
    title: `Quiz Results | QuizHub`,
    description: `View your quiz score and detailed performance.`,
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
