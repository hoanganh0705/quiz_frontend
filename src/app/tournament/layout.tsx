import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Tournaments | QuizHub',
  description: 'Compete in quiz tournaments and win rewards.',
  path: '/tournament'
})

export default function TournamentLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
