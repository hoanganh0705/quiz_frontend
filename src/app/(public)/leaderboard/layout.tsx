import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Leaderboard | QuizHub',
  description: 'See top players and track global quiz rankings.',
  path: '/leaderboard'
})

export default function LeaderboardLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
