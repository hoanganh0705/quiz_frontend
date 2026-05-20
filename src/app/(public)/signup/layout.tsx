import type { ReactNode } from 'react'
import { buildMetadata } from '@/shared/lib/seo'

export const metadata = buildMetadata({
  title: 'Sign Up | QuizHub',
  description: 'Create your QuizHub account and start playing quizzes.',
  path: '/signup'
})

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children
}
