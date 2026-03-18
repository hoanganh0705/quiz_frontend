import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Reset Password | QuizHub',
  description: 'Reset your QuizHub password and regain account access.',
  path: '/forgot-password'
})

export default function ForgotPasswordLayout({
  children
}: {
  children: ReactNode
}) {
  return children
}
