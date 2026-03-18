import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Quiz Categories | QuizHub',
  description: 'Explore quizzes by category and find topics you love.',
  path: '/categories'
})

export default function CategoriesLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
