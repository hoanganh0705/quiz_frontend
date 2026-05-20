import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'My Profile | QuizHub',
  description: 'View your progress, achievements, and activity history.',
  path: '/my-profile'
})

export default function MyProfileLayout({ children }: { children: ReactNode }) {
  return children
}
