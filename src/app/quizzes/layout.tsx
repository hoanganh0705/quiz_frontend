import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Explore Quizzes | QuizHub',
  description:
    'Browse and discover quizzes by topic, difficulty, and popularity.',
  path: '/quizzes'
})

export default function QuizzesLayout({ children }: { children: ReactNode }) {
  return children
}
