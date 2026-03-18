import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Quiz History | QuizHub',
  description: 'Review your past attempts, scores, and performance trends.',
  path: '/quiz-history'
})

export default function QuizHistoryLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
