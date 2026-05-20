import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Login | QuizHub',
  description: 'Sign in to continue your quiz journey on QuizHub.',
  path: '/login'
})

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
