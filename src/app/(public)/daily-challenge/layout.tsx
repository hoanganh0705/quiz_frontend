import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Daily Challenge | QuizHub',
  description: 'Take the daily quiz challenge and compare your performance.',
  path: '/daily-challenge'
})

export default function DailyChallengeLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
