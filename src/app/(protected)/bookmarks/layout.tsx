import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Bookmarked Quizzes | QuizHub',
  description: 'Manage your saved quizzes and custom bookmark collections.',
  path: '/bookmarks'
})

export default function BookmarksLayout({ children }: { children: ReactNode }) {
  return children
}
