import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Quiz Discussions | QuizHub',
  description: 'Join discussions, ask questions, and learn from the community.',
  path: '/discussions'
})

export default function DiscussionsLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
