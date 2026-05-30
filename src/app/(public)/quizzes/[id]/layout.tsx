import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getQuizBySlug } from '@/features/quizzes/api'
import { buildMetadata, siteConfig } from '@/shared/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
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
      title: 'Quiz Details | QuizHub',
      description: 'View quiz details, difficulty, and rewards.',
      path: `/quizzes/${id}`
    })
  }
}

export default async function QuizIdLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let quiz = null
  try {
    quiz = await getQuizBySlug(id)
  } catch {
    // Quiz not found
  }

  const quizJsonLd = quiz
    ? {
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: quiz.title,
        description: quiz.description,
        educationalLevel: quiz.difficulty,
        timeRequired: quiz.duration ? `PT${quiz.duration}S` : undefined,
        numberOfQuestions: quiz.questionCount,
        isAccessibleForFree: true,
        url: new URL(`/quizzes/${id}`, siteConfig.url).toString(),
        image: quiz.imageUrl ? new URL(quiz.imageUrl, siteConfig.url).toString() : undefined,
      }
    : null

  return (
    <>
      {quizJsonLd ? (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(quizJsonLd) }}
        />
      ) : null}
      {children}
    </>
  )
}
