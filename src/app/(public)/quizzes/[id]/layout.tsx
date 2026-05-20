import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { quizzes } from '@/constants/mockQuizzes'
import { buildMetadata, siteConfig } from '@/lib/seo'

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const quiz = quizzes.find((item) => item.id === id)

  if (!quiz) {
    return buildMetadata({
      title: 'Quiz Details | QuizHub',
      description: 'View quiz details, difficulty, and rewards.',
      path: `/quizzes/${id}`
    })
  }

  return buildMetadata({
    title: `${quiz.title} | QuizHub`,
    description: quiz.description,
    path: `/quizzes/${id}`
  })
}

export default async function QuizIdLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const quiz = quizzes.find((item) => item.id === id)

  const quizJsonLd = quiz
    ? {
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: quiz.title,
        description: quiz.description,
        educationalLevel: quiz.difficulty,
        timeRequired: `PT${quiz.duration}S`,
        numberOfQuestions: quiz.questionCount,
        isAccessibleForFree: true,
        url: new URL(`/quizzes/${quiz.id}`, siteConfig.url).toString(),
        image: new URL(quiz.image, siteConfig.url).toString(),
        creator: {
          '@type': 'Person',
          name: quiz.creator.name
        }
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
